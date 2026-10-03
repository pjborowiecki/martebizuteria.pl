import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_MUTATION_KEYS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { updateDiscount, updateDiscountMutation } from "~/src/modules/discount/use-cases/update-discount"

const stubs = vi.hoisted(() => ({
  getDiscountByCode: vi.fn<(code: string) => Promise<{ code: string; id: string } | undefined>>(),
  getDiscountById: vi.fn<(id: string) => Promise<{ code: string; id: string } | undefined>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { role: string } } | null>>(),
  recordDiscountUpdatedAudit: vi.fn(),
  updateDiscountById: vi.fn<(id: string, values: Record<string, unknown>) => Promise<void>>(),
}))

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/admin/coupons") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordDiscountUpdatedAudit: stubs.recordDiscountUpdatedAudit }))
vi.mock("~/src/modules/discount/discount.accessors", () => ({
  getDiscountByCode: stubs.getDiscountByCode,
  getDiscountById: stubs.getDiscountById,
  updateDiscountById: stubs.updateDiscountById,
}))

const DISCOUNT_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const NOW = new Date("2026-06-01T12:00:00.000Z")

const FORM_VALUES = {
  code: "spring-24",
  description: "Spring sale",
  endsAt: "2026-06-30T23:59:59.000Z",
  isActive: true,
  minOrderTotal: 10_000,
  startsAt: "2026-06-01T00:00:00.000Z",
  type: DISCOUNT_TYPE.FIXED_AMOUNT,
  value: 2500,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN } })
  stubs.getDiscountById.mockResolvedValue({ code: "SPRING-24", id: DISCOUNT_ID })
  stubs.getDiscountByCode.mockResolvedValue(undefined)
  stubs.updateDiscountById.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("updateDiscount", () => {
  it("saves the edited values onto the discount it was asked to change", async () => {
    await expect(updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })).resolves.toStrictEqual({ code: "SPRING-24", ok: true })
    expect(stubs.updateDiscountById).toHaveBeenCalledWith(
      DISCOUNT_ID,
      expect.objectContaining({
        code: "SPRING-24",
        description: "Spring sale",
        endsAt: new Date("2026-06-30T23:59:59.000Z"),
        isActive: true,
        minOrderTotal: 10_000,
        startsAt: new Date("2026-06-01T00:00:00.000Z"),
        type: DISCOUNT_TYPE.FIXED_AMOUNT,
        updatedAt: NOW,
        value: 2500,
      }),
    )
  })

  it("clears the limits the admin emptied instead of keeping the old ones", async () => {
    await updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })
    const values = stubs.updateDiscountById.mock.lastCall?.[1]

    expect(values?.["maxDiscountAmount"]).toBeInstanceOf(SQL)
    expect(values?.["perCustomerLimit"]).toBeInstanceOf(SQL)
    expect(values?.["usageLimit"]).toBeInstanceOf(SQL)
  })

  it("keeps the same code without checking it against itself", async () => {
    await updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })

    expect(stubs.getDiscountByCode).not.toHaveBeenCalled()
  })

  it("renames the code when no other discount uses the new one", async () => {
    await expect(updateDiscount({ data: { id: DISCOUNT_ID, values: { ...FORM_VALUES, code: "summer-25" } } })).resolves.toStrictEqual({
      code: "SUMMER-25",
      ok: true,
    })
    expect(stubs.getDiscountByCode).toHaveBeenCalledWith("SUMMER-25")
    expect(stubs.updateDiscountById).toHaveBeenCalledWith(DISCOUNT_ID, expect.objectContaining({ code: "SUMMER-25" }))
  })

  it("refuses to rename the code onto one another discount already uses", async () => {
    stubs.getDiscountByCode.mockResolvedValue({ code: "SUMMER-25", id: "discount-other" })

    await expect(updateDiscount({ data: { id: DISCOUNT_ID, values: { ...FORM_VALUES, code: "summer-25" } } })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: DISCOUNT_ERROR_CODES.CODE_TAKEN,
    })
    expect(stubs.updateDiscountById).not.toHaveBeenCalled()
    expect(stubs.recordDiscountUpdatedAudit).not.toHaveBeenCalled()
  })

  it("reports a discount that no longer exists as not found", async () => {
    stubs.getDiscountById.mockResolvedValue(undefined)

    await expect(updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: DISCOUNT_ERROR_CODES.NOT_FOUND,
    })
    expect(stubs.updateDiscountById).not.toHaveBeenCalled()
  })

  it("records the change in the audit log with the description as detail", async () => {
    await updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })

    expect(stubs.recordDiscountUpdatedAudit).toHaveBeenCalledWith("SPRING-24", { detail: "Spring sale" })
  })

  it("turns away a customer who cannot manage orders", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(updateDiscount({ data: { id: DISCOUNT_ID, values: FORM_VALUES } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.getDiscountById).not.toHaveBeenCalled()
  })

  it("rejects an id that is not a uuid before touching the database", async () => {
    await expect(updateDiscount({ data: { id: "discount-1", values: FORM_VALUES } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
    })
    expect(stubs.getDiscountById).not.toHaveBeenCalled()
  })
})

describe("updateDiscountMutation", () => {
  it("keys the mutation by the shared update key", () => {
    expect(updateDiscountMutation.mutationKey).toStrictEqual(DISCOUNT_MUTATION_KEYS.UPDATE)
  })

  it("updates the discount it is handed", async () => {
    await expect(
      new MutationObserver(new QueryClient(), updateDiscountMutation).mutate({ id: DISCOUNT_ID, values: FORM_VALUES }),
    ).resolves.toStrictEqual({ code: "SPRING-24", ok: true })
    expect(stubs.updateDiscountById).toHaveBeenCalledOnce()
  })
})

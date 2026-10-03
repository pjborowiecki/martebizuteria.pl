import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_MUTATION_KEYS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { createDiscount, createDiscountMutation } from "~/src/modules/discount/use-cases/create-discount"

const stubs = vi.hoisted(() => ({
  getDiscountByCode: vi.fn<(code: string) => Promise<{ id: string } | undefined>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { role: string } } | null>>(),
  insertDiscount: vi.fn<(values: Discount["insert"]) => Promise<void>>(),
  recordDiscountCreatedAudit: vi.fn(),
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
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordDiscountCreatedAudit: stubs.recordDiscountCreatedAudit }))
vi.mock("~/src/modules/discount/discount.accessors", () => ({
  getDiscountByCode: stubs.getDiscountByCode,
  insertDiscount: stubs.insertDiscount,
}))

const FORM_VALUES = {
  code: " spring-24 ",
  description: "  Spring sale  ",
  endsAt: "",
  isActive: true,
  startsAt: "",
  type: DISCOUNT_TYPE.PERCENTAGE,
  value: 15,
}

beforeEach(() => {
  vi.clearAllMocks()
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN } })
  stubs.getDiscountByCode.mockResolvedValue(undefined)
  stubs.insertDiscount.mockResolvedValue(undefined)
})

describe("createDiscount", () => {
  it("stores a new discount under its normalised code", async () => {
    await expect(createDiscount({ data: { values: FORM_VALUES } })).resolves.toStrictEqual({ code: "SPRING-24", ok: true })
    expect(stubs.insertDiscount).toHaveBeenCalledWith({
      code: "SPRING-24",
      description: "Spring sale",
      endsAt: undefined,
      isActive: true,
      maxDiscountAmount: undefined,
      minOrderTotal: undefined,
      perCustomerLimit: undefined,
      startsAt: undefined,
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageLimit: undefined,
      value: 15,
    })
  })

  it("checks the normalised code for a clash before inserting", async () => {
    await createDiscount({ data: { values: FORM_VALUES } })

    expect(stubs.getDiscountByCode).toHaveBeenCalledWith("SPRING-24")
  })

  it("records the creation in the audit log with the description as detail", async () => {
    await createDiscount({ data: { values: FORM_VALUES } })

    expect(stubs.recordDiscountCreatedAudit).toHaveBeenCalledWith("SPRING-24", { detail: "Spring sale" })
  })

  it("refuses a code another discount already uses", async () => {
    stubs.getDiscountByCode.mockResolvedValue({ id: "discount-existing" })

    await expect(createDiscount({ data: { values: FORM_VALUES } })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: DISCOUNT_ERROR_CODES.CODE_TAKEN,
    })
    expect(stubs.insertDiscount).not.toHaveBeenCalled()
    expect(stubs.recordDiscountCreatedAudit).not.toHaveBeenCalled()
  })

  it("turns away a visitor who is not signed in", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await expect(createDiscount({ data: { values: FORM_VALUES } })).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
    expect(stubs.insertDiscount).not.toHaveBeenCalled()
  })

  it("turns away a customer who cannot manage orders", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(createDiscount({ data: { values: FORM_VALUES } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.insertDiscount).not.toHaveBeenCalled()
  })

  it("rejects a percentage above one hundred before touching the database", async () => {
    await expect(createDiscount({ data: { values: { ...FORM_VALUES, value: 150 } } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
    })
    expect(stubs.getDiscountByCode).not.toHaveBeenCalled()
  })
})

describe("createDiscountMutation", () => {
  it("keys the mutation by the shared create key", () => {
    expect(createDiscountMutation.mutationKey).toStrictEqual(DISCOUNT_MUTATION_KEYS.CREATE)
  })

  it("creates the discount it is handed", async () => {
    await expect(new MutationObserver(new QueryClient(), createDiscountMutation).mutate({ values: FORM_VALUES })).resolves.toStrictEqual({
      code: "SPRING-24",
      ok: true,
    })
    expect(stubs.insertDiscount).toHaveBeenCalledOnce()
  })
})

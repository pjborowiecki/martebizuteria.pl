import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_MUTATION_KEYS } from "~/src/modules/discount/discount.constants"
import { deleteDiscounts, deleteDiscountsMutation } from "~/src/modules/discount/use-cases/delete-discounts"

const stubs = vi.hoisted(() => ({
  deleteDiscountsByIds: vi.fn<(ids: readonly string[]) => Promise<number>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { role: string } } | null>>(),
  recordDiscountDeletedAudit: vi.fn(),
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
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordDiscountDeletedAudit: stubs.recordDiscountDeletedAudit }))
vi.mock("~/src/modules/discount/discount.accessors", () => ({ deleteDiscountsByIds: stubs.deleteDiscountsByIds }))

const IDS = ["0192f3a4-5b6c-7d8e-9fab-cdef01234567", "0192f3a4-5b6c-7d8e-9fab-cdef01234568"]

beforeEach(() => {
  vi.clearAllMocks()
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN } })
  stubs.deleteDiscountsByIds.mockResolvedValue(IDS.length)
})

describe("deleteDiscounts", () => {
  it("deletes the selected discounts and reports how many went", async () => {
    await expect(deleteDiscounts({ data: { ids: IDS } })).resolves.toStrictEqual({ deleted: 2, ok: true })
    expect(stubs.deleteDiscountsByIds).toHaveBeenCalledWith(IDS)
  })

  it("records the deletion in the audit log with the ids it was asked to remove", async () => {
    await deleteDiscounts({ data: { ids: IDS } })

    expect(stubs.recordDiscountDeletedAudit).toHaveBeenCalledWith("2", { metadata: { ids: IDS } })
  })

  it("reports the number actually deleted when some were already gone", async () => {
    stubs.deleteDiscountsByIds.mockResolvedValue(1)

    await expect(deleteDiscounts({ data: { ids: IDS } })).resolves.toStrictEqual({ deleted: 1, ok: true })
    expect(stubs.recordDiscountDeletedAudit).toHaveBeenCalledWith("1", { metadata: { ids: IDS } })
  })

  it("rejects an empty selection before touching the database", async () => {
    await expect(deleteDiscounts({ data: { ids: [] } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stubs.deleteDiscountsByIds).not.toHaveBeenCalled()
  })

  it("rejects an id that is not a uuid", async () => {
    await expect(deleteDiscounts({ data: { ids: ["discount-1"] } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stubs.deleteDiscountsByIds).not.toHaveBeenCalled()
  })

  it("turns away a visitor who is not signed in", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await expect(deleteDiscounts({ data: { ids: IDS } })).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
    expect(stubs.deleteDiscountsByIds).not.toHaveBeenCalled()
  })

  it("turns away a customer who cannot manage orders", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(deleteDiscounts({ data: { ids: IDS } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.deleteDiscountsByIds).not.toHaveBeenCalled()
  })
})

describe("deleteDiscountsMutation", () => {
  it("keys the mutation by the shared delete key", () => {
    expect(deleteDiscountsMutation.mutationKey).toStrictEqual(DISCOUNT_MUTATION_KEYS.DELETE)
  })

  it("deletes the discounts it is handed", async () => {
    await expect(new MutationObserver(new QueryClient(), deleteDiscountsMutation).mutate({ ids: IDS })).resolves.toStrictEqual({
      deleted: 2,
      ok: true,
    })
  })
})

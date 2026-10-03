import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type AdminDiscountsListParams } from "~/src/modules/discount/discount.accessors"
import {
  ADMIN_DISCOUNTS_PAGE_SIZE,
  DISCOUNT_QUERY_KEYS,
  DISCOUNT_QUERY_STALE_MS,
  DISCOUNT_STATUS,
  DISCOUNT_TYPE,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { getAdminDiscountsPage, getAdminDiscountsPageQuery } from "~/src/modules/discount/use-cases/get-admin-discounts-page"

const stubs = vi.hoisted(() => ({
  getAdminDiscountsPage: vi.fn<(params: AdminDiscountsListParams) => Promise<{ rows: Discount["select"][]; total: number }>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { role: string } } | null>>(),
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
vi.mock("~/src/modules/discount/discount.accessors", () => ({ getAdminDiscountsPage: stubs.getAdminDiscountsPage }))

const NOW = new Date("2026-06-01T12:00:00.000Z")

const discountRow = (overrides: Partial<Discount["select"]> = {}): Discount["select"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  startsAt: null,
  type: DISCOUNT_TYPE.PERCENTAGE,
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  usageCount: 3,
  usageLimit: null,
  value: 15,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN } })
  stubs.getAdminDiscountsPage.mockResolvedValue({ rows: [discountRow()], total: 1 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getAdminDiscountsPage", () => {
  it("reads the first page at the admin page size when no page is given", async () => {
    await getAdminDiscountsPage({ data: {} })

    expect(stubs.getAdminDiscountsPage).toHaveBeenCalledWith({ limit: ADMIN_DISCOUNTS_PAGE_SIZE, offset: 0, search: undefined })
  })

  it("reads the requested page and page size with the search trimmed", async () => {
    await getAdminDiscountsPage({ data: { page: 3, pageSize: 10, search: "  spring  " } })

    expect(stubs.getAdminDiscountsPage).toHaveBeenCalledWith({ limit: 10, offset: 20, search: "spring" })
  })

  it("ignores a search made only of spaces", async () => {
    await getAdminDiscountsPage({ data: { search: "   " } })

    expect(stubs.getAdminDiscountsPage).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }))
  })

  it("lists each discount with its limits and its status as of now", async () => {
    stubs.getAdminDiscountsPage.mockResolvedValue({
      rows: [
        discountRow({ description: "Spring sale", maxDiscountAmount: 5000, startsAt: new Date("2026-07-01T00:00:00.000Z") }),
        discountRow({ code: "OLD", endsAt: new Date("2026-05-15T00:00:00.000Z"), id: "discount-2" }),
      ],
      total: 2,
    })

    const page = await getAdminDiscountsPage({ data: {} })

    expect(page.items).toStrictEqual([
      {
        code: "SPRING-24",
        description: "Spring sale",
        endsAt: undefined,
        id: "discount-1",
        isActive: true,
        maxDiscountAmountMinorUnits: 5000,
        minOrderTotalMinorUnits: undefined,
        perCustomerLimit: undefined,
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        status: DISCOUNT_STATUS.SCHEDULED,
        type: DISCOUNT_TYPE.PERCENTAGE,
        usageCount: 3,
        usageLimit: undefined,
        value: 15,
      },
      expect.objectContaining({ code: "OLD", status: DISCOUNT_STATUS.EXPIRED }),
    ])
  })

  it("says more pages follow while the total exceeds what has been shown", async () => {
    stubs.getAdminDiscountsPage.mockResolvedValue({ rows: [discountRow()], total: 3 })

    await expect(getAdminDiscountsPage({ data: { page: 2, pageSize: 1 } })).resolves.toMatchObject({
      hasMore: true,
      limit: 1,
      offset: 1,
      total: 3,
    })
  })

  it("says the list is complete on the last page", async () => {
    await expect(getAdminDiscountsPage({ data: {} })).resolves.toMatchObject({ hasMore: false, total: 1 })
  })

  it("rejects a page number below one", async () => {
    await expect(getAdminDiscountsPage({ data: { page: 0 } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stubs.getAdminDiscountsPage).not.toHaveBeenCalled()
  })

  it("turns away a customer who cannot read orders", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(getAdminDiscountsPage({ data: {} })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.getAdminDiscountsPage).not.toHaveBeenCalled()
  })
})

describe("getAdminDiscountsPageQuery", () => {
  it("keys each page by its own input under the admin page key", () => {
    expect(getAdminDiscountsPageQuery({ page: 2, search: "spring" }).queryKey).toStrictEqual([
      ...DISCOUNT_QUERY_KEYS.ADMIN.PAGE,
      { page: 2, search: "spring" },
    ])
  })

  it("keeps a page for the discount stale window without refetching on mount or focus", () => {
    const options = getAdminDiscountsPageQuery({})

    expect(options.staleTime).toBe(DISCOUNT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the page it describes through the server function", async () => {
    const page = await new QueryClient().query(getAdminDiscountsPageQuery({ page: 2, pageSize: 5 }))

    expect(stubs.getAdminDiscountsPage).toHaveBeenCalledWith({ limit: 5, offset: 5, search: undefined })
    expect(page.items.map((item) => item.code)).toStrictEqual(["SPRING-24"])
  })
})

import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_QUERY_KEYS, DISCOUNT_QUERY_STALE_MS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { getDiscountStats, getDiscountStatsQuery } from "~/src/modules/discount/use-cases/get-admin-discount-stats"

const stubs = vi.hoisted(() => ({
  getAdminDiscountStats: vi.fn<(now: Date) => Promise<Discount["adminStats"]>>(),
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
vi.mock("~/src/modules/discount/discount.accessors", () => ({ getAdminDiscountStats: stubs.getAdminDiscountStats }))

const NOW = new Date("2026-06-01T12:00:00.000Z")

const STATS: Discount["adminStats"] = {
  active: 4,
  currencyCode: "PLN",
  redeemedTotalMinorUnits: 18_500,
  redemptions: 12,
  total: 7,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN } })
  stubs.getAdminDiscountStats.mockResolvedValue(STATS)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getDiscountStats", () => {
  it("returns the figures the accessor computed", async () => {
    await expect(getDiscountStats()).resolves.toStrictEqual(STATS)
  })

  it("counts active discounts as of the moment of the request", async () => {
    await getDiscountStats()

    expect(stubs.getAdminDiscountStats).toHaveBeenCalledWith(NOW)
  })

  it("turns away a visitor who is not signed in", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await expect(getDiscountStats()).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
    expect(stubs.getAdminDiscountStats).not.toHaveBeenCalled()
  })

  it("turns away a customer who cannot read orders", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(getDiscountStats()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.getAdminDiscountStats).not.toHaveBeenCalled()
  })
})

describe("getDiscountStatsQuery", () => {
  it("keys the stats under the shared admin stats key", () => {
    expect(getDiscountStatsQuery().queryKey).toStrictEqual(DISCOUNT_QUERY_KEYS.ADMIN.STATS)
  })

  it("keeps the stats for the discount stale window without refetching on mount or focus", () => {
    const options = getDiscountStatsQuery()

    expect(options.staleTime).toBe(DISCOUNT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches through the server function", async () => {
    await expect(new QueryClient().query(getDiscountStatsQuery())).resolves.toStrictEqual(STATS)
  })
})

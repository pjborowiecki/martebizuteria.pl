import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

const queries = vi.hoisted(() => ({
  page: vi.fn<(input: object) => Promise<{ items: readonly { code: string }[] }>>(),
  stats: vi.fn<() => Promise<Discount["adminStats"]>>(),
}))

interface RouteDefinition {
  readonly loader?: (ctx: Readonly<{ context: { queryClient: QueryClient } }>) => Promise<void>
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", async () => {
  const { DISCOUNT_QUERY_KEYS: keys } = await import("~/src/modules/discount/discount.constants")

  return {
    getAdminDiscountsPageQuery: (input: object) => ({ queryFn: () => queries.page(input), queryKey: [...keys.ADMIN.PAGE, input] }),
  }
})
vi.mock("~/src/modules/discount/use-cases/get-admin-discount-stats", async () => {
  const { DISCOUNT_QUERY_KEYS: keys } = await import("~/src/modules/discount/discount.constants")

  return { getDiscountStatsQuery: () => ({ queryFn: () => queries.stats(), queryKey: keys.ADMIN.STATS }) }
})
vi.mock("~/src/presentation/components/custom/pages/admin/coupons/coupon-list-table", () => ({ CouponListTable: () => null }))
vi.mock("~/src/presentation/components/custom/pages/admin/coupons/coupon-stats", () => ({ CouponStats: () => null }))
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({ AdminHeader: () => null }))

await import("~/src/routes/admin.coupons")

const route = captured.current

if (route?.loader === undefined) {
  throw new Error("the admin coupons route registered no loader")
}

const runLoader = (queryClient: QueryClient) => route.loader?.({ context: { queryClient } })

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const STATS: Discount["adminStats"] = { active: 3, currencyCode: "PLN", redeemedTotalMinorUnits: 124_500, redemptions: 42, total: 7 }

beforeEach(() => {
  vi.clearAllMocks()
  queries.page.mockResolvedValue({ items: [{ code: "SPRING20" }] })
  queries.stats.mockResolvedValue(STATS)
})

describe("admin coupons loader", () => {
  it("warms the unfiltered first coupon page and the stat cards before the page renders", async () => {
    const queryClient = createQueryClient()

    await runLoader(queryClient)

    expect(queries.page).toHaveBeenCalledExactlyOnceWith({})
    expect(queryClient.getQueryData([...DISCOUNT_QUERY_KEYS.ADMIN.PAGE, {}])).toStrictEqual({ items: [{ code: "SPRING20" }] })
    expect(queryClient.getQueryData(DISCOUNT_QUERY_KEYS.ADMIN.STATS)).toStrictEqual(STATS)
  })

  it("serves both warmed queries from the cache on a second visit", async () => {
    const queryClient = createQueryClient()

    await runLoader(queryClient)
    await runLoader(queryClient)

    expect(queries.page).toHaveBeenCalledOnce()
    expect(queries.stats).toHaveBeenCalledOnce()
  })

  it("fails the navigation when the coupon list cannot be read", async () => {
    queries.page.mockRejectedValue(new Error("coupons unavailable"))

    await expect(runLoader(createQueryClient())).rejects.toThrow("coupons unavailable")
  })

  it("fails the navigation when the coupon stats cannot be read", async () => {
    queries.stats.mockRejectedValue(new Error("stats unavailable"))

    await expect(runLoader(createQueryClient())).rejects.toThrow("stats unavailable")
  })
})

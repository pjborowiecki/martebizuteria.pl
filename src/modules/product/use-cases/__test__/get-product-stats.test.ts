import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  authorized: vi.fn(),
  lowStock: vi.fn<() => Promise<readonly { readonly count: number }[]>>(),
  statusCounts: vi.fn<() => Promise<readonly Record<string, number>[]>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: accessors.authorized }))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getLowStockPublishedProductCountQuery: { execute: accessors.lowStock },
  getProductStatusCountsQuery: { execute: accessors.statusCounts },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

import { QueryClient } from "@tanstack/react-query"

import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { getProductStats, getProductStatsQuery } from "~/src/modules/product/use-cases/get-product-stats"

beforeEach(() => {
  vi.resetAllMocks()
  accessors.lowStock.mockResolvedValue([{ count: 3 }])
  accessors.statusCounts.mockResolvedValue([{ active: 12, archived: 1, draft: 4, total: 17 }])
})

describe("getProductStats", () => {
  it("reports the counts the catalog accessors return", async () => {
    await expect(getProductStats()).resolves.toStrictEqual({ active: 12, archived: 1, draft: 4, lowStock: 3, total: 17 })
  })

  it("reports zeros when the catalog is empty", async () => {
    accessors.statusCounts.mockResolvedValue([])
    accessors.lowStock.mockResolvedValue([])

    await expect(getProductStats()).resolves.toStrictEqual({ active: 0, archived: 0, draft: 0, lowStock: 0, total: 0 })
  })

  it("fills in the counts the status query left out", async () => {
    accessors.statusCounts.mockResolvedValue([{ active: 5 }])

    await expect(getProductStats()).resolves.toStrictEqual({ active: 5, archived: 0, draft: 0, lowStock: 3, total: 0 })
  })

  it("asks both accessors exactly once", async () => {
    await getProductStats()

    expect(accessors.statusCounts).toHaveBeenCalledTimes(1)
    expect(accessors.lowStock).toHaveBeenCalledTimes(1)
  })
})

describe("getProductStatsQuery", () => {
  it("keys the stats under the shared admin stats key", () => {
    expect(getProductStatsQuery().queryKey).toStrictEqual(PRODUCT_QUERY_KEYS.ADMIN.STATS)
  })

  it("keeps the stats fresh for the catalog stale window and does not refetch on focus", () => {
    const options = getProductStatsQuery()

    expect(options.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches through the server function", async () => {
    const result = await getProductStatsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: PRODUCT_QUERY_KEYS.ADMIN.STATS,
      signal: new AbortController().signal,
    })

    expect(result).toStrictEqual({ active: 12, archived: 1, draft: 4, lowStock: 3, total: 17 })
  })
})

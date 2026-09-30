import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  averageProductsPerOrder: vi.fn(),
  rollup: vi.fn(),
  total: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/modules/user/user.accessors", () => ({
  getAdminCustomerOrderRollupStatsQuery: { execute: accessors.rollup },
  getAdminCustomerTotalCountQuery: { execute: accessors.total },
  getAverageProductsPerOrderQuery: { execute: accessors.averageProductsPerOrder },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => async () => {
        await Promise.resolve()

        return handler()
      },
      middleware: () => builder,
    }

    return builder
  },
}))

import { getAdminCustomerStats, getAdminCustomerStatsQuery } from "~/src/modules/user/use-cases/get-admin-customer-stats"
import { ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

beforeEach(() => {
  vi.clearAllMocks()
  accessors.total.mockResolvedValue([{ count: 120 }])
  accessors.rollup.mockResolvedValue([{ averageLtv: 24_512.4, customersWithOrders: 80, repeatCustomers: 20 }])
  accessors.averageProductsPerOrder.mockResolvedValue([{ value: 2.46 }])
})

describe("getAdminCustomerStats", () => {
  it("combines the three aggregates into one figure set", async () => {
    await expect(getAdminCustomerStats()).resolves.toStrictEqual({
      averageLtv: 24_512,
      averageProductsPerOrder: 2.5,
      returningRate: 25,
      total: 120,
    })
  })

  it("asks each aggregate exactly once", async () => {
    await getAdminCustomerStats()

    expect(accessors.total).toHaveBeenCalledOnce()
    expect(accessors.rollup).toHaveBeenCalledOnce()
    expect(accessors.averageProductsPerOrder).toHaveBeenCalledOnce()
  })

  it("reports zeroes for a store that has no customers yet", async () => {
    accessors.total.mockResolvedValue([])
    accessors.rollup.mockResolvedValue([])
    accessors.averageProductsPerOrder.mockResolvedValue([])

    await expect(getAdminCustomerStats()).resolves.toStrictEqual({
      averageLtv: 0,
      averageProductsPerOrder: 0,
      returningRate: 0,
      total: 0,
    })
  })

  it("avoids dividing by zero when nobody has ordered", async () => {
    accessors.rollup.mockResolvedValue([{ averageLtv: 0, customersWithOrders: 0, repeatCustomers: 0 }])

    const stats = await getAdminCustomerStats()

    expect(stats.returningRate).toBe(0)
  })

  it("rounds the returning rate to a whole percent", async () => {
    accessors.rollup.mockResolvedValue([{ averageLtv: 0, customersWithOrders: 3, repeatCustomers: 1 }])

    const stats = await getAdminCustomerStats()

    expect(stats.returningRate).toBe(33)
  })

  it("reads a rate of every ordering customer as a hundred percent", async () => {
    accessors.rollup.mockResolvedValue([{ averageLtv: 0, customersWithOrders: 40, repeatCustomers: 40 }])

    const stats = await getAdminCustomerStats()

    expect(stats.returningRate).toBe(100)
  })

  it("accepts the numeric strings sqlite aggregates return", async () => {
    accessors.total.mockResolvedValue([{ count: "17" }])
    accessors.rollup.mockResolvedValue([{ averageLtv: "1999.6", customersWithOrders: "10", repeatCustomers: "5" }])
    accessors.averageProductsPerOrder.mockResolvedValue([{ value: "3.14" }])

    await expect(getAdminCustomerStats()).resolves.toStrictEqual({
      averageLtv: 2000,
      averageProductsPerOrder: 3.1,
      returningRate: 50,
      total: 17,
    })
  })

  it("treats a null aggregate as zero", async () => {
    accessors.total.mockResolvedValue([{ count: null }])
    accessors.rollup.mockResolvedValue([{ averageLtv: null, customersWithOrders: null, repeatCustomers: null }])
    accessors.averageProductsPerOrder.mockResolvedValue([{ value: null }])

    await expect(getAdminCustomerStats()).resolves.toStrictEqual({
      averageLtv: 0,
      averageProductsPerOrder: 0,
      returningRate: 0,
      total: 0,
    })
  })
})

describe("getAdminCustomerStatsQuery", () => {
  it("caches the stats under the customer stats key without refetching on mount", () => {
    const options = getAdminCustomerStatsQuery()

    expect(options.queryKey).toStrictEqual(USER_QUERY_KEYS.ADMIN.CUSTOMER_STATS)
    expect(options.staleTime).toBe(ADMIN_CUSTOMER_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

it("loads customer aggregates through the cache query", async () => {
  await expect(new QueryClient().query(getAdminCustomerStatsQuery())).resolves.toStrictEqual({
    averageLtv: 24_512,
    averageProductsPerOrder: 2.5,
    returningRate: 25,
    total: 120,
  })
  expect(accessors.total).toHaveBeenCalledOnce()
})

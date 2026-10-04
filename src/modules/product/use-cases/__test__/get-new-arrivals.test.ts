import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
  LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
  PRODUCT_QUERY_KEYS,
  PRODUCT_QUERY_STALE_MS,
} from "~/src/modules/product/product.constants"

const access = vi.hoisted(() => ({ publishedProducts: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getPublishedProductsByCollectionHandle: access.publishedProducts }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => () => handler(),
      middleware: () => builder,
    }

    return builder
  },
}))

import { getNewArrivals, getNewArrivalsQuery } from "~/src/modules/product/use-cases/get-new-arrivals"

const product = { handle: "silver-ring", id: "product-1", titles: { "en-US": "Silver ring", "pl-PL": "Srebrny" } }

beforeEach(() => {
  vi.clearAllMocks()
  access.publishedProducts.mockResolvedValue([])
})

describe("getNewArrivals", () => {
  it("reads the first page of published products of the landing page collection by its handle", async () => {
    await getNewArrivals()

    expect(access.publishedProducts).toHaveBeenCalledExactlyOnceWith(LANDING_NEW_ARRIVALS_COLLECTION_HANDLE, {
      limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
      offset: 0,
    })
  })

  it("returns the products the collection holds", async () => {
    access.publishedProducts.mockResolvedValue([product])

    await expect(getNewArrivals()).resolves.toStrictEqual([product])
  })
})

describe("getNewArrivalsQuery", () => {
  it("keys the landing new arrivals on their own cache entry", () => {
    expect(getNewArrivalsQuery().queryKey).toStrictEqual(PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS)
  })

  it("keeps the list fresh for the shared product window", () => {
    expect(getNewArrivalsQuery().staleTime).toBe(PRODUCT_QUERY_STALE_MS)
  })
})

it("loads the new arrivals through their cache query", async () => {
  access.publishedProducts.mockResolvedValue([product])
  await expect(new QueryClient().query(getNewArrivalsQuery())).resolves.toStrictEqual([product])
  expect(access.publishedProducts).toHaveBeenCalledExactlyOnceWith(LANDING_NEW_ARRIVALS_COLLECTION_HANDLE, {
    limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
    offset: 0,
  })
})

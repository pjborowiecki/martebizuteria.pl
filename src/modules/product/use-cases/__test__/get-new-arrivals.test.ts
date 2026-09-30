import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
  LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
  PRODUCT_QUERY_KEYS,
  PRODUCT_QUERY_STALE_MS,
} from "~/src/modules/product/product.constants"

const access = vi.hoisted(() => ({ collection: vi.fn(), publishedProducts: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getStorefrontCollectionByHandleQuery: { execute: access.collection },
}))
vi.mock("~/src/modules/product/product.accessors", () => ({ getPublishedProductsByCollectionId: access.publishedProducts }))
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
  access.collection.mockResolvedValue(undefined)
  access.publishedProducts.mockResolvedValue({ items: [] })
})

describe("getNewArrivals", () => {
  it("looks the collection up by the landing page handle", async () => {
    await getNewArrivals()

    expect(access.collection).toHaveBeenCalledWith({ handle: LANDING_NEW_ARRIVALS_COLLECTION_HANDLE })
  })

  it("shows nothing while the new arrivals collection is missing", async () => {
    await expect(getNewArrivals()).resolves.toStrictEqual([])
    expect(access.publishedProducts).not.toHaveBeenCalled()
  })

  it("reads the first page of published products of that collection", async () => {
    access.collection.mockResolvedValue({ id: "collection-1" })
    await getNewArrivals()

    expect(access.publishedProducts).toHaveBeenCalledWith("collection-1", { limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT, offset: 0 })
  })

  it("returns the products the collection holds", async () => {
    access.collection.mockResolvedValue({ id: "collection-1" })
    access.publishedProducts.mockResolvedValue({ items: [product] })

    await expect(getNewArrivals()).resolves.toStrictEqual([product])
  })

  it("returns an empty list for a collection with nothing published", async () => {
    access.collection.mockResolvedValue({ id: "collection-1" })

    await expect(getNewArrivals()).resolves.toStrictEqual([])
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

it("loads the new arrivals collection through its cache query", async () => {
  access.collection.mockResolvedValue({ id: "collection-1" })
  access.publishedProducts.mockResolvedValue({ items: [product] })
  await expect(new QueryClient().query(getNewArrivalsQuery())).resolves.toStrictEqual([product])
  expect(access.publishedProducts).toHaveBeenCalledWith("collection-1", { limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT, offset: 0 })
})

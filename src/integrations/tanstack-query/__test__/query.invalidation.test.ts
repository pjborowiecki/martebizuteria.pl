import { QueryClient, QueryObserver, infiniteQueryOptions } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { invalidateQueryPrefix } from "~/src/integrations/tanstack-query/query.invalidation"

const PRODUCT_LIST_KEY = ["admin", "products", "list"]

const CATALOGUE_KEY = ["products", "storefront-page", { sort: "newest" }]

const observe = (client: QueryClient, options: ConstructorParameters<typeof QueryObserver>[1]): (() => void) =>
  new QueryObserver(client, options).subscribe(vi.fn<() => void>())

const catalogueQuery = (cataloguePage: (context: { readonly pageParam: number }) => Promise<string>) =>
  infiniteQueryOptions({
    getNextPageParam: (_lastPage: string, _allPages: string[], lastPageParam: number) => lastPageParam + 1,
    initialPageParam: 1,
    queryFn: cataloguePage,
    queryKey: CATALOGUE_KEY,
    staleTime: 60_000,
  })

describe("invalidateQueryPrefix on cached queries", () => {
  it("drops idle cached queries under the prefix that nothing observes and keeps every other prefix", async () => {
    const client = new QueryClient()
    client.setQueryData(PRODUCT_LIST_KEY, ["ring"])
    client.setQueryData(["admin", "orders"], ["order"])

    await invalidateQueryPrefix(client, ["admin", "products"])

    expect(client.getQueryState(PRODUCT_LIST_KEY)).toBeUndefined()
    expect(client.getQueryState(["admin", "orders"])?.isInvalidated).toBe(false)
  })

  it("keeps the pages of an infinite list nothing shows without refetching them, so the next read refetches every page", async () => {
    const client = new QueryClient()
    const cataloguePage = vi.fn(({ pageParam }: { readonly pageParam: number }) => Promise.resolve(`page ${String(pageParam)}`))
    await client.infiniteQuery({ ...catalogueQuery(cataloguePage), pages: 2 })
    cataloguePage.mockClear()

    await invalidateQueryPrefix(client, ["products"])

    expect(cataloguePage).not.toHaveBeenCalled()
    expect(client.getQueryState(CATALOGUE_KEY)?.isInvalidated).toBe(true)
    await expect(client.infiniteQuery(catalogueQuery(cataloguePage))).resolves.toMatchObject({ pageParams: [1, 2] })
    expect(cataloguePage).toHaveBeenCalledTimes(2)
  })
})

describe("invalidateQueryPrefix on observed queries", () => {
  it("refetches an observed query once", async () => {
    const client = new QueryClient()
    const productList = vi.fn(() => Promise.resolve(["ring"]))
    await client.query({ queryFn: productList, queryKey: PRODUCT_LIST_KEY })
    const unsubscribe = observe(client, { queryFn: productList, queryKey: PRODUCT_LIST_KEY, staleTime: Infinity })
    productList.mockClear()

    await invalidateQueryPrefix(client, ["admin", "products"])

    expect(productList).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it("marks an observed but disabled query invalid without fetching it, so it refetches once enabled", async () => {
    const client = new QueryClient()
    const productList = vi.fn(() => Promise.resolve(["ring"]))
    await client.query({ queryFn: productList, queryKey: PRODUCT_LIST_KEY })
    const unsubscribe = observe(client, { enabled: false, queryFn: productList, queryKey: PRODUCT_LIST_KEY })
    productList.mockClear()

    await invalidateQueryPrefix(client, ["admin", "products"])

    expect(productList).not.toHaveBeenCalled()
    expect(client.getQueryState(PRODUCT_LIST_KEY)?.isInvalidated).toBe(true)
    unsubscribe()
  })
})

describe("invalidateQueryPrefix on fetches in flight", () => {
  it("keeps a query nothing observes while its first fetch is in flight, so the loader awaiting it resolves", async () => {
    const client = new QueryClient()
    const response = Promise.withResolvers<string[]>()
    const loading = client.query({ queryFn: () => response.promise, queryKey: PRODUCT_LIST_KEY })

    const invalidation = invalidateQueryPrefix(client, ["admin", "products"])
    response.resolve(["ring"])

    await expect(loading).resolves.toStrictEqual(["ring"])
    await invalidation
  })

  it("restarts a fetch nothing observes that started from cached data, so its caller gets the post-event response", async () => {
    const client = new QueryClient()
    const preEvent = Promise.withResolvers<string[]>()
    const productList = vi.fn<() => Promise<string[]>>().mockReturnValueOnce(preEvent.promise).mockResolvedValue(["ring", "brooch"])
    client.setQueryData(PRODUCT_LIST_KEY, ["ring"])
    const loading = client.query({ queryFn: productList, queryKey: PRODUCT_LIST_KEY, staleTime: 0 })

    const invalidation = invalidateQueryPrefix(client, ["admin", "products"])
    preEvent.resolve(["ring"])

    await expect(loading).resolves.toStrictEqual(["ring", "brooch"])
    await invalidation
    expect(productList).toHaveBeenCalledTimes(2)
  })
})

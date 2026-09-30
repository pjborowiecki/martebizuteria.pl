import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  STOREFRONT_SEARCH_LIMIT_PER_GROUP,
  STOREFRONT_SEARCH_QUERY_KEYS,
  STOREFRONT_SEARCH_TRENDING_LIMIT,
} from "~/src/modules/storefront-search/storefront-search.constants"

import { getTrendingSearches, getTrendingSearchesQuery } from "../get-trending-searches"
import { searchStorefront, searchStorefrontQuery } from "../search-storefront"

interface TrendingRow {
  readonly handle: string
  readonly image: string | null
  readonly titles: Record<string, string>
}

const server = vi.hoisted(() => ({
  searchCategories: vi.fn(),
  searchCollections: vi.fn(),
  searchProducts: vi.fn(),
}))

const database = vi.hoisted(() => {
  const state: { categories: unknown[]; collections: unknown[]; limits: number[]; tables: unknown[] } = {
    categories: [],
    collections: [],
    limits: [],
    tables: [],
  }

  return { state }
})

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { productCategory } = await import("~/src/modules/product-category/product-category.schema")

  const builder = (table: unknown) => {
    const chain = {
      limit: (value: number) => {
        database.state.limits.push(value)

        return Promise.resolve(table === productCategory ? database.state.categories : database.state.collections)
      },
      orderBy: () => chain,
      where: () => chain,
    }

    return chain
  }

  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          database.state.tables.push(table)

          return builder(table)
        },
      }),
    },
  }
})
vi.mock("~/src/modules/storefront-search/storefront-search.server", () => ({
  searchStorefrontCategories: server.searchCategories,
  searchStorefrontCollections: server.searchCollections,
  searchStorefrontProducts: server.searchProducts,
}))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (src?: string | null) => src ?? "placeholder.svg" }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            handler({ data: validate(options?.data) }),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const category = (handle: string, titles: Record<string, string>, image: string | null = null): TrendingRow => ({ handle, image, titles })

describe("searchStorefront", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.searchProducts.mockResolvedValue([{ handle: "ring", name: "Ring", type: "product" }])
    server.searchCategories.mockResolvedValue([{ handle: "rings", name: "Rings", type: "category" }])
    server.searchCollections.mockResolvedValue([{ handle: "spring", name: "Spring", type: "collection" }])
  })

  it("groups each source's hits under its own key", async () => {
    await expect(searchStorefront({ data: { locale: "en-US", query: "ring" } })).resolves.toStrictEqual({
      categories: [{ handle: "rings", name: "Rings", type: "category" }],
      collections: [{ handle: "spring", name: "Spring", type: "collection" }],
      products: [{ handle: "ring", name: "Ring", type: "product" }],
    })
  })

  it("passes the trimmed term, the locale and the per-group limit to every source", async () => {
    await searchStorefront({ data: { locale: "en-US", query: "  silver ring  " } })

    for (const search of [server.searchProducts, server.searchCategories, server.searchCollections]) {
      expect(search).toHaveBeenCalledExactlyOnceWith("silver ring", "en-US", STOREFRONT_SEARCH_LIMIT_PER_GROUP)
    }
  })

  it("defaults to the polish storefront locale when none is given", async () => {
    await searchStorefront({ data: { query: "ring" } })

    expect(server.searchProducts).toHaveBeenCalledExactlyOnceWith("ring", "pl-PL", STOREFRONT_SEARCH_LIMIT_PER_GROUP)
  })

  it.each([["r"], [" "], [""]])("refuses the too-short query %j before touching the database", (query) => {
    expect(() => {
      void searchStorefront({ data: { query } })
    }).toThrow()
    expect(server.searchProducts).not.toHaveBeenCalled()
  })

  it("keys the cached results by locale and query", () => {
    expect(searchStorefrontQuery("ring", "en-US").queryKey).toStrictEqual([...STOREFRONT_SEARCH_QUERY_KEYS.RESULTS, "en-US", "ring"])
  })

  it("only enables the query once the term is long enough", () => {
    expect(searchStorefrontQuery("r").enabled).toBe(false)
    expect(searchStorefrontQuery("  ri  ").enabled).toBe(true)
  })

  it("searches the storefront for the cached term in the cached locale", async () => {
    const options = searchStorefrontQuery("ring", "en-US")

    await options.queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: options.queryKey,
      signal: new AbortController().signal,
    })

    expect(server.searchProducts).toHaveBeenCalledExactlyOnceWith("ring", "en-US", STOREFRONT_SEARCH_LIMIT_PER_GROUP)
  })
})

describe("getTrendingSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    database.state.categories = []
    database.state.collections = []
    database.state.limits = []
    database.state.tables = []
  })

  it("labels categories before collections in the trending list", async () => {
    database.state.categories = [category("rings", { "en-US": "Rings", "pl-PL": "Pierścionki" }, "categories/rings.jpg")]
    database.state.collections = [category("spring", { "en-US": "Spring", "pl-PL": "Wiosna" })]

    await expect(getTrendingSearches({ data: { locale: "en-US" } })).resolves.toStrictEqual([
      { handle: "rings", image: "categories/rings.jpg", label: "Rings", type: "category" },
      { handle: "spring", image: "placeholder.svg", label: "Spring", type: "collection" },
    ])
  })

  it("labels the entries in the locale it is asked for", async () => {
    database.state.categories = [category("rings", { "en-US": "Rings", "pl-PL": "Pierścionki" })]

    await expect(getTrendingSearches({ data: { locale: "pl-PL" } })).resolves.toMatchObject([{ label: "Pierścionki" }])
  })

  it("falls back to the other locale rather than dropping a half-translated entry", async () => {
    database.state.categories = [category("rings", { "en-US": "   ", "pl-PL": "Pierścionki" })]
    database.state.collections = []

    await expect(getTrendingSearches({ data: { locale: "en-US" } })).resolves.toMatchObject([{ label: "Pierścionki" }])
  })

  it("drops an entry that carries no label in any locale", async () => {
    database.state.categories = [category("rings", { "en-US": "   ", "pl-PL": "  " })]
    database.state.collections = [category("spring", { "en-US": "Spring", "pl-PL": "Wiosna" })]

    await expect(getTrendingSearches({ data: { locale: "en-US" } })).resolves.toStrictEqual([
      { handle: "spring", image: "placeholder.svg", label: "Spring", type: "collection" },
    ])
  })

  it("splits the trending budget evenly across both sources", async () => {
    await getTrendingSearches({ data: { locale: "en-US" } })

    expect(database.state.limits).toStrictEqual([3, 3])
  })

  it("never returns more entries than the trending limit", async () => {
    const rows = Array.from({ length: 4 }, (_, index) => category(`c-${index}`, { "en-US": `C ${index}`, "pl-PL": `C ${index}` }))
    database.state.categories = rows
    database.state.collections = rows

    const items = await getTrendingSearches({ data: { locale: "en-US" } })

    expect(items).toHaveLength(STOREFRONT_SEARCH_TRENDING_LIMIT)
  })

  it("returns nothing when neither source has active rows", async () => {
    await expect(getTrendingSearches({ data: { locale: "en-US" } })).resolves.toStrictEqual([])
  })

  it("keys the cached trending list by locale", () => {
    expect(getTrendingSearchesQuery("en-US").queryKey).toStrictEqual([...STOREFRONT_SEARCH_QUERY_KEYS.TRENDING, "en-US"])
    expect(getTrendingSearchesQuery().queryKey).toStrictEqual([...STOREFRONT_SEARCH_QUERY_KEYS.TRENDING, "pl-PL"])
  })
})

it("loads trending entries through the cache query", async () => {
  database.state.categories = [category("rings", { "en-US": "Rings", "pl-PL": "Pierścionki" })]
  database.state.collections = []
  await expect(new QueryClient().query(getTrendingSearchesQuery("en-US"))).resolves.toStrictEqual([
    { handle: "rings", image: "placeholder.svg", label: "Rings", type: "category" },
  ])
})
it("defaults trending searches to Polish when locale is omitted", async () => {
  database.state.categories = [category("rings", { "en-US": "Rings", "pl-PL": "Pierścionki" })]
  database.state.collections = []
  await expect(getTrendingSearches({ data: {} })).resolves.toMatchObject([{ label: "Pierścionki" }])
})

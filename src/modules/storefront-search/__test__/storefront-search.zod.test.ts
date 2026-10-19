import { describe, expect, it } from "vite-plus/test"

import { STOREFRONT_SEARCH_MAX_LENGTH } from "~/src/modules/storefront-search/storefront-search.constants"
import {
  storefrontProductsSearchSchema,
  storefrontScopedCategoryCatalogSearchSchema,
  storefrontScopedCollectionCatalogSearchSchema,
} from "~/src/modules/storefront-search/storefront-search.zod"

describe("storefrontProductsSearchSchema", () => {
  it("accepts a search with no filters at all", () => {
    expect(storefrontProductsSearchSchema.parse({})).toStrictEqual({})
  })

  it.each([[{ category: "  " }], [{ collection: "" }], [{ q: "   " }]])("rejects the blank filter %j rather than dropping it", (search) => {
    expect(storefrontProductsSearchSchema.safeParse(search).success).toBe(false)
  })

  it("trims a filter that carries content", () => {
    expect(storefrontProductsSearchSchema.parse({ q: "  silver ring  " })).toStrictEqual({ q: "silver ring" })
  })

  it.each([
    ["the catalog", storefrontProductsSearchSchema],
    ["a category page", storefrontScopedCategoryCatalogSearchSchema],
    ["a collection page", storefrontScopedCollectionCatalogSearchSchema],
  ])("cuts a search term in a link to %s down to the longest the search overlay sends", (_page, schema) => {
    expect(schema.parse({ q: "r".repeat(STOREFRONT_SEARCH_MAX_LENGTH + 1) })).toStrictEqual({ q: "r".repeat(STOREFRONT_SEARCH_MAX_LENGTH) })
  })

  it("keeps a search term of exactly the maximum whole", () => {
    const longest = "r".repeat(STOREFRONT_SEARCH_MAX_LENGTH)

    expect(storefrontProductsSearchSchema.parse({ q: `  ${longest}  ` })).toStrictEqual({ q: longest })
  })

  it("drops the space the cut leaves at the end of a long search term", () => {
    const firstWord = "r".repeat(STOREFRONT_SEARCH_MAX_LENGTH - 1)

    expect(storefrontProductsSearchSchema.parse({ q: `${firstWord} ring` })).toStrictEqual({ q: firstWord })
  })

  it("coerces price bounds from the query string", () => {
    expect(storefrontProductsSearchSchema.parse({ maxPrice: "50000", minPrice: "0" })).toStrictEqual({ maxPrice: 50_000, minPrice: 0 })
  })

  it("rejects a negative price bound", () => {
    expect(storefrontProductsSearchSchema.safeParse({ minPrice: "-1" }).success).toBe(false)
  })

  it("rejects a sort it does not know", () => {
    expect(storefrontProductsSearchSchema.safeParse({ sort: "cheapest" }).success).toBe(false)
  })

  it("scopes a collection page without a collection filter of its own", () => {
    expect("collection" in storefrontScopedCollectionCatalogSearchSchema.shape).toBe(false)
    expect("category" in storefrontScopedCollectionCatalogSearchSchema.shape).toBe(true)
  })

  it("scopes a category page without a category filter of its own", () => {
    expect("category" in storefrontScopedCategoryCatalogSearchSchema.shape).toBe(false)
    expect("collection" in storefrontScopedCategoryCatalogSearchSchema.shape).toBe(true)
  })
})

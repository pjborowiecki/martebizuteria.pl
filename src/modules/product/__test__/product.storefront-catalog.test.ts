import { describe, expect, it } from "vite-plus/test"

import {
  STOREFRONT_PRODUCTS_SORT,
  STOREFRONT_PRODUCTS_SORTS,
  type StorefrontProductsSearch,
  applyStorefrontProductsSearchPatch,
  buildEffectiveStorefrontProductsSearch,
  countActiveStorefrontProductFilters,
  hasActiveStorefrontProductFilters,
  isStorefrontProductsSort,
  normalizeStorefrontProductsSearch,
  storefrontCatalogFilterOptions,
  storefrontProductsSearchSchema,
  storefrontScopedCategoryCatalogSearchSchema,
  storefrontScopedCollectionCatalogSearchSchema,
} from "~/src/modules/product/product.storefront-catalog"

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

describe("countActiveStorefrontProductFilters", () => {
  it("counts nothing for an empty search", () => {
    expect(countActiveStorefrontProductFilters({})).toBe(0)
    expect(hasActiveStorefrontProductFilters({})).toBe(false)
  })

  it("counts each independent filter once", () => {
    const search: StorefrontProductsSearch = {
      category: "kolczyki",
      collection: "wiosna",
      maxPrice: 50_000,
      minPrice: 1000,
      q: "silver",
      sort: STOREFRONT_PRODUCTS_SORT.PRICE_ASC,
    }

    expect(countActiveStorefrontProductFilters(search)).toBe(6)
    expect(hasActiveStorefrontProductFilters(search)).toBe(true)
  })

  it("does not count the default ranking as a filter", () => {
    expect(countActiveStorefrontProductFilters({ sort: STOREFRONT_PRODUCTS_SORT.RANK })).toBe(0)
    expect(countActiveStorefrontProductFilters({ sort: STOREFRONT_PRODUCTS_SORT.NEWEST })).toBe(1)
  })

  it("ignores the filter a scoped page already pins", () => {
    expect(countActiveStorefrontProductFilters({ category: "kolczyki" }, { ignoreCategory: true })).toBe(0)
    expect(countActiveStorefrontProductFilters({ collection: "wiosna" }, { ignoreCollection: true })).toBe(0)
  })

  it("counts a price bound of zero as an active filter", () => {
    expect(countActiveStorefrontProductFilters({ minPrice: 0 })).toBe(1)
  })
})

describe("normalizeStorefrontProductsSearch", () => {
  it("keeps only the keys that carry a value", () => {
    expect(normalizeStorefrontProductsSearch({ category: undefined, q: "silver" })).toStrictEqual({ q: "silver" })
  })

  it("preserves every populated filter", () => {
    const search: StorefrontProductsSearch = {
      category: "kolczyki",
      collection: "wiosna",
      maxPrice: 50_000,
      minPrice: 1000,
      q: "silver",
      sort: STOREFRONT_PRODUCTS_SORT.NEWEST,
    }

    expect(normalizeStorefrontProductsSearch(search)).toStrictEqual(search)
  })

  it("leaves no undefined keys behind", () => {
    expect(Object.keys(normalizeStorefrontProductsSearch({ maxPrice: undefined, minPrice: undefined }))).toStrictEqual([])
  })
})

describe("buildEffectiveStorefrontProductsSearch", () => {
  it("leaves an unscoped search alone", () => {
    expect(buildEffectiveStorefrontProductsSearch({ q: "silver" })).toStrictEqual({ q: "silver" })
  })

  it("pins the page's own category over whatever the query asked for", () => {
    expect(buildEffectiveStorefrontProductsSearch({ category: "naszyjniki" }, { categoryHandle: "kolczyki" })).toStrictEqual({
      category: "kolczyki",
    })
  })

  it("pins the page's own collection", () => {
    expect(buildEffectiveStorefrontProductsSearch({ q: "silver" }, { collectionHandle: "wiosna" })).toStrictEqual({
      collection: "wiosna",
      q: "silver",
    })
  })

  it("tells the filter counter which filter the page already pins", () => {
    expect(storefrontCatalogFilterOptions({ categoryHandle: "kolczyki" })).toStrictEqual({
      ignoreCategory: true,
      ignoreCollection: false,
    })
    expect(storefrontCatalogFilterOptions()).toStrictEqual({ ignoreCategory: false, ignoreCollection: false })
  })

  it("reports no active filters on a scoped page that pins its own handle", () => {
    const scope = { categoryHandle: "kolczyki" }
    const effective = buildEffectiveStorefrontProductsSearch({}, scope)

    expect(countActiveStorefrontProductFilters(effective, storefrontCatalogFilterOptions(scope))).toBe(0)
  })
})

describe("applyStorefrontProductsSearchPatch", () => {
  const current: StorefrontProductsSearch = { category: "kolczyki", minPrice: 1000, q: "silver" }

  it("clears everything when asked", () => {
    expect(applyStorefrontProductsSearchPatch(current, { q: "gold" }, { clearAll: true })).toStrictEqual({})
  })

  it("replaces a filter that the patch names", () => {
    expect(applyStorefrontProductsSearchPatch(current, { q: "gold" })).toStrictEqual({ category: "kolczyki", minPrice: 1000, q: "gold" })
  })

  it("removes a filter the patch sets to undefined", () => {
    expect(applyStorefrontProductsSearchPatch(current, { q: undefined })).toStrictEqual({ category: "kolczyki", minPrice: 1000 })
  })

  it("leaves untouched filters alone", () => {
    expect(applyStorefrontProductsSearchPatch(current, {})).toStrictEqual(current)
  })

  it("clears a scope filter and a range filter in one patch", () => {
    expect(applyStorefrontProductsSearchPatch(current, { category: undefined, minPrice: undefined })).toStrictEqual({ q: "silver" })
  })

  it("adds a sort the current search did not have", () => {
    expect(applyStorefrontProductsSearchPatch({}, { sort: STOREFRONT_PRODUCTS_SORT.PRICE_DESC })).toStrictEqual({
      sort: STOREFRONT_PRODUCTS_SORT.PRICE_DESC,
    })
  })

  it("sets a collection filter the current search did not have", () => {
    expect(applyStorefrontProductsSearchPatch({}, { collection: "wiosna" })).toStrictEqual({ collection: "wiosna" })
  })

  it("replaces a price ceiling", () => {
    expect(applyStorefrontProductsSearchPatch({ maxPrice: 1000 }, { maxPrice: 50_000 })).toStrictEqual({ maxPrice: 50_000 })
  })

  it("sets a category filter the current search did not have", () => {
    expect(applyStorefrontProductsSearchPatch({}, { category: "kolczyki" })).toStrictEqual({ category: "kolczyki" })
  })

  it("replaces the category the shopper had chosen", () => {
    expect(applyStorefrontProductsSearchPatch(current, { category: "pierscionki" })).toStrictEqual({
      category: "pierscionki",
      minPrice: 1000,
      q: "silver",
    })
  })

  it("drops the collection filter the patch clears", () => {
    expect(applyStorefrontProductsSearchPatch({ collection: "wiosna", q: "silver" }, { collection: undefined })).toStrictEqual({
      q: "silver",
    })
  })

  it("raises the price floor the patch names", () => {
    expect(applyStorefrontProductsSearchPatch({ maxPrice: 50_000 }, { minPrice: 10_000 })).toStrictEqual({
      maxPrice: 50_000,
      minPrice: 10_000,
    })
  })

  it("drops the price ceiling the patch clears", () => {
    expect(applyStorefrontProductsSearchPatch({ maxPrice: 50_000, minPrice: 1000 }, { maxPrice: undefined })).toStrictEqual({
      minPrice: 1000,
    })
  })

  it("drops the sort the patch clears, falling back to the default order", () => {
    expect(
      applyStorefrontProductsSearchPatch({ q: "silver", sort: STOREFRONT_PRODUCTS_SORT.PRICE_DESC }, { sort: undefined }),
    ).toStrictEqual({ q: "silver" })
  })

  it("leaves no undefined keys behind", () => {
    expect(Object.keys(applyStorefrontProductsSearchPatch(current, { category: undefined }))).not.toContain("category")
  })
})

describe("isStorefrontProductsSort", () => {
  it("accepts every configured sort", () => {
    for (const sort of STOREFRONT_PRODUCTS_SORTS) {
      expect(isStorefrontProductsSort(sort)).toBe(true)
    }
  })

  it.each([["cheapest"], ["RANK"], [""], ["toString"]])("rejects the unknown sort %j", (value) => {
    expect(isStorefrontProductsSort(value)).toBe(false)
  })
})

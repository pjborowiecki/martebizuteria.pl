import { describe, expect, it } from "vite-plus/test"

import {
  STOREFRONT_SEARCH_DEBOUNCE_MS,
  STOREFRONT_SEARCH_LIMIT_PER_GROUP,
  STOREFRONT_SEARCH_LOCALE_MIN_LENGTH,
  STOREFRONT_SEARCH_MIN_LENGTH,
  STOREFRONT_SEARCH_QUERY_KEYS,
  STOREFRONT_SEARCH_QUERY_STALE_MS,
  STOREFRONT_SEARCH_TRENDING_LIMIT,
  STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT,
} from "~/src/modules/storefront-search/storefront-search.constants"

describe("storefront search query keys", () => {
  it("nests the trending key under the results key so one invalidation clears both", () => {
    expect(STOREFRONT_SEARCH_QUERY_KEYS.RESULTS).toStrictEqual(["storefront-search"])
    expect(STOREFRONT_SEARCH_QUERY_KEYS.TRENDING).toStrictEqual(["storefront-search", "trending"])
    expect(STOREFRONT_SEARCH_QUERY_KEYS.TRENDING[0]).toBe(STOREFRONT_SEARCH_QUERY_KEYS.RESULTS[0])
  })
})

describe("storefront search thresholds", () => {
  it("waits for at least two characters before searching", () => {
    expect(STOREFRONT_SEARCH_MIN_LENGTH).toBe(2)
  })

  it("debounces the shopper's typing without letting the results go stale first", () => {
    expect(STOREFRONT_SEARCH_DEBOUNCE_MS).toBe(300)
    expect(STOREFRONT_SEARCH_QUERY_STALE_MS).toBeGreaterThan(STOREFRONT_SEARCH_DEBOUNCE_MS)
  })

  it("keeps each result group short enough for the dropdown", () => {
    expect(STOREFRONT_SEARCH_LIMIT_PER_GROUP).toBe(6)
    expect(STOREFRONT_SEARCH_TRENDING_LIMIT).toBeLessThan(STOREFRONT_SEARCH_LIMIT_PER_GROUP)
  })

  it("blends two sources into the trending list", () => {
    expect(STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT).toBe(2)
    expect(STOREFRONT_SEARCH_TRENDING_LIMIT).toBeGreaterThanOrEqual(STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT)
  })

  it("accepts a single character of locale before resolving copy", () => {
    expect(STOREFRONT_SEARCH_LOCALE_MIN_LENGTH).toBe(1)
  })
})

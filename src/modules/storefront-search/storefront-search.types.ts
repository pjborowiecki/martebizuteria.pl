type StorefrontSearchResultType = "category" | "collection" | "page" | "product"

type StorefrontSearchTrendingType = "category" | "collection"

interface StorefrontSearchResultItem {
  readonly detail?: string | undefined
  readonly handle: string
  readonly image?: string
  readonly name: string
  readonly type: StorefrontSearchResultType
}

interface StorefrontSearchResults {
  readonly categories: readonly StorefrontSearchResultItem[]
  readonly collections: readonly StorefrontSearchResultItem[]
  readonly products: readonly StorefrontSearchResultItem[]
}

interface StorefrontSearchTrendingItem {
  readonly handle: string
  readonly image?: string
  readonly label: string
  readonly type: StorefrontSearchTrendingType
}

export interface StorefrontSearch {
  resultItem: StorefrontSearchResultItem
  resultType: StorefrontSearchResultType
  results: StorefrontSearchResults
  trendingItem: StorefrontSearchTrendingItem
  trendingType: StorefrontSearchTrendingType
}

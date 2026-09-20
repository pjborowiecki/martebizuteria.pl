export type StorefrontSearchResultType = "category" | "collection" | "page" | "product"

export type StorefrontSearchTrendingType = "category" | "collection"

export interface StorefrontSearchResultItem {
  readonly detail?: string | undefined
  readonly handle: string
  readonly image?: string
  readonly name: string
  readonly type: StorefrontSearchResultType
}

export interface StorefrontSearchResults {
  readonly categories: readonly StorefrontSearchResultItem[]
  readonly collections: readonly StorefrontSearchResultItem[]
  readonly products: readonly StorefrontSearchResultItem[]
}

export interface StorefrontSearchTrendingItem {
  readonly handle: string
  readonly image?: string
  readonly label: string
  readonly type: StorefrontSearchTrendingType
}

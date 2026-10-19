export const WISHLIST_MAX_ITEMS = 200

export const WISHLIST_ERROR_CODES = {
  FULL: "WISHLIST_FULL",
} as const

export const WISHLIST_QUERY_STALE_MS = 30_000

export const WISHLIST_QUERY_KEYS = {
  ITEMS: ["wishlist", "items"] as const,
  PRODUCT_IDS: ["wishlist", "productIds"] as const,
  ROOT: ["wishlist"] as const,
} as const

export const WISHLIST_MUTATION_KEYS = {
  TOGGLE: ["wishlist", "toggleItem"] as const,
} as const

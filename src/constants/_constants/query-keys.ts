/**
 * TanStack Query key factories. Use via `CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL`, etc.
 *
 * Static segments use SCREAMING_SNAKE_CASE; parameterized keys use camelCase factories (avoids `new-cap`).
 *
 * Keep segments stable: changing a value invalidates a different cache bucket.
 */

const QUERY_KEY_ROOTS = {
  ADMIN: ["admin"] as const
} as const;

const CATEGORY_QUERY_KEYS = {
  ADMIN: {
    ALL: [...QUERY_KEY_ROOTS.ADMIN, "categories"] as const,
    STATS: [...QUERY_KEY_ROOTS.ADMIN, "categories", "stats"] as const
  },
  ALL: ["categories"] as const,
  byHandle: (handle: string) => ["category", handle] as const
} as const;

const COLLECTION_QUERY_KEYS = {
  ADMIN: {
    ALL: [...QUERY_KEY_ROOTS.ADMIN, "collections"] as const,
    STATS: [...QUERY_KEY_ROOTS.ADMIN, "collections", "stats"] as const
  },
  ALL: ["collections"] as const,
  byHandle: (handle: string) => ["collection", handle] as const
} as const;

const PRODUCT_QUERY_KEYS = {
  ALL: ["products"] as const,
  byCategoryId: (categoryId: string | null) => ["related-products", categoryId] as const,
  byHandle: (handle: string) => ["product", handle] as const
} as const;

const MESSAGES_QUERY_KEYS = {
  byLocale: (locale: string) => ["messages", locale] as const
} as const;

const ADDRESS_QUERY_KEYS = {
  ALL: ["userAddresses"] as const
} as const;

const DELIVERY_METHOD_QUERY_KEYS = {
  ALL: ["deliveryMethods"] as const
} as const;

const INPOST_QUERY_KEYS = {
  byCity: (city: string) => ["inpost-points", "city", city.trim().toLowerCase()] as const
} as const;

export const QUERY_KEYS = {
  ADDRESS: ADDRESS_QUERY_KEYS,
  CATEGORY: CATEGORY_QUERY_KEYS,
  COLLECTION: COLLECTION_QUERY_KEYS,
  DELIVERY_METHOD: DELIVERY_METHOD_QUERY_KEYS,
  INPOST: INPOST_QUERY_KEYS,
  MESSAGES: MESSAGES_QUERY_KEYS,
  PRODUCT: PRODUCT_QUERY_KEYS,
  ROOTS: QUERY_KEY_ROOTS
} as const;

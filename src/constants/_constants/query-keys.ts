/**
 * TanStack Query key factories. Use via `CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL`, etc.
 *
 * Static segments and parameterized key prefixes both use SCREAMING_SNAKE_CASE.
 * Build full keys by spreading a prefix and appending parameters, e.g.
 * `[...CONSTANTS.QUERY_KEYS.CATEGORY.BY_HANDLE, handle, page]`.
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
  BY_HANDLE: ["category"] as const
} as const;

const COLLECTION_QUERY_KEYS = {
  ADMIN: {
    ALL: [...QUERY_KEY_ROOTS.ADMIN, "collections"] as const,
    STATS: [...QUERY_KEY_ROOTS.ADMIN, "collections", "stats"] as const
  },
  ALL: ["collections"] as const,
  BY_HANDLE: ["collection"] as const
} as const;

const PRODUCT_QUERY_KEYS = {
  ADMIN: {
    ALL: [...QUERY_KEY_ROOTS.ADMIN, "products"] as const,
    BY_HANDLE: [...QUERY_KEY_ROOTS.ADMIN, "products", "by-handle"] as const,
    PAGE: [...QUERY_KEY_ROOTS.ADMIN, "products", "page"] as const,
    STATS: [...QUERY_KEY_ROOTS.ADMIN, "products", "stats"] as const
  },
  ALL: ["products"] as const,
  BY_HANDLE: ["product"] as const,
  RELATED_BY_CATEGORY: ["related-products"] as const
} as const;

const PRODUCT_ATTRIBUTE_QUERY_KEYS = {
  ADMIN: {
    ALL: [...QUERY_KEY_ROOTS.ADMIN, "product-attributes"] as const,
    STATS: [...QUERY_KEY_ROOTS.ADMIN, "product-attributes", "stats"] as const
  }
} as const;

const ATTRIBUTE_ON_PRODUCT_QUERY_KEYS = {
  BY_PRODUCT_ID: ["attribute-on-product"] as const
} as const;

const PRODUCT_IMAGE_QUERY_KEYS = {
  BY_PRODUCT_ID: ["product-images"] as const
} as const;

const MESSAGES_QUERY_KEYS = {
  BY_LOCALE: ["messages"] as const
} as const;

const ADDRESS_QUERY_KEYS = {
  ALL: ["userAddresses"] as const
} as const;

const DELIVERY_METHOD_QUERY_KEYS = {
  ALL: ["deliveryMethods"] as const
} as const;

const INPOST_QUERY_KEYS = {
  BY_CITY: ["inpost-points", "city"] as const
} as const;

export const QUERY_KEYS = {
  ADDRESS: ADDRESS_QUERY_KEYS,
  ATTRIBUTE_ON_PRODUCT: ATTRIBUTE_ON_PRODUCT_QUERY_KEYS,
  CATEGORY: CATEGORY_QUERY_KEYS,
  COLLECTION: COLLECTION_QUERY_KEYS,
  DELIVERY_METHOD: DELIVERY_METHOD_QUERY_KEYS,
  INPOST: INPOST_QUERY_KEYS,
  MESSAGES: MESSAGES_QUERY_KEYS,
  PRODUCT: PRODUCT_QUERY_KEYS,
  PRODUCT_ATTRIBUTE: PRODUCT_ATTRIBUTE_QUERY_KEYS,
  PRODUCT_IMAGE: PRODUCT_IMAGE_QUERY_KEYS,
  ROOTS: QUERY_KEY_ROOTS
} as const;

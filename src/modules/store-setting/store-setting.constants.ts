export const STORE_SETTING_ID = "store"

export const FREE_DELIVERY_THRESHOLD_MAX = 10_000_000

export const SELLER_DETAILS_FIELDS = ["legalName", "street", "postalCode", "city", "countryCode", "nip", "regon", "email", "phone"] as const

export type SellerDetailsField = (typeof SELLER_DETAILS_FIELDS)[number]

export const SELLER_DETAILS_MAX_LENGTH = {
  city: 80,
  email: 254,
  legalName: 200,
  phone: 30,
  postalCode: 12,
  street: 120,
} as const

export const SELLER_DETAILS_AUDIT_TARGET = "seller-details"

export const STORE_SETTING_QUERY_KEYS = {
  ADMIN: {
    FREE_DELIVERY: ["admin", "store-setting", "free-delivery"] as const,
    SALES: ["admin", "store-setting", "sales"] as const,
    SELLER_DETAILS: ["admin", "store-setting", "seller-details"] as const,
  },
  FREE_DELIVERY: ["store-setting", "free-delivery"] as const,
  SALES: ["store-setting", "sales"] as const,
  SELLER_DETAILS: ["store-setting", "seller-details"] as const,
} as const

export const STORE_SETTING_MUTATION_KEYS = {
  SET_FREE_DELIVERY_THRESHOLD: ["store-setting", "setFreeDeliveryThreshold"] as const,
  SET_SALES_PAUSED: ["store-setting", "setSalesPaused"] as const,
  UPDATE_SELLER_DETAILS: ["store-setting", "updateSellerDetails"] as const,
} as const

export const STORE_SETTING_ID = "store"

export const FREE_DELIVERY_THRESHOLD_MAX = 10_000_000

export const STORE_SETTING_QUERY_KEYS = {
  ADMIN: {
    FREE_DELIVERY: ["admin", "store-setting", "free-delivery"] as const,
    SALES: ["admin", "store-setting", "sales"] as const,
  },
  FREE_DELIVERY: ["store-setting", "free-delivery"] as const,
  SALES: ["store-setting", "sales"] as const,
} as const

export const STORE_SETTING_MUTATION_KEYS = {
  SET_FREE_DELIVERY_THRESHOLD: ["store-setting", "setFreeDeliveryThreshold"] as const,
  SET_SALES_PAUSED: ["store-setting", "setSalesPaused"] as const,
} as const

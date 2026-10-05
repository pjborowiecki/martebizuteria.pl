export const STORE_SETTING_ID = "store"

export const STORE_SETTING_QUERY_KEYS = {
  ADMIN: {
    SALES: ["admin", "store-setting", "sales"] as const,
  },
  SALES: ["store-setting", "sales"] as const,
} as const

export const STORE_SETTING_MUTATION_KEYS = {
  SET_SALES_PAUSED: ["store-setting", "setSalesPaused"] as const,
} as const

export const CUSTOMER_ACCOUNT_QUERY_STALE_MS = 60_000
export const CUSTOMER_ACCOUNT_ORDERS_LIMIT = 50
export const CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT = 5
export const CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT = 3
export const CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT = 3

export const CUSTOMER_ACCOUNT_ORDER_FILTERS = ["all", "delivered", "shipped", "processing", "cancelled"] as const

export type CustomerAccountOrderFilter = (typeof CUSTOMER_ACCOUNT_ORDER_FILTERS)[number]

export const CUSTOMER_ACCOUNT_QUERY_KEYS = {
  LOGIN_HISTORY: ["customer-account", "login-history"] as const,
  ORDERS: ["customer-account", "orders"] as const,
  ORDER_BY_ID: ["customer-account", "order"] as const,
  OVERVIEW: ["customer-account", "overview"] as const,
  PROFILE: ["customer-account", "profile"] as const,
  SESSIONS: ["customer-account", "sessions"] as const,
} as const

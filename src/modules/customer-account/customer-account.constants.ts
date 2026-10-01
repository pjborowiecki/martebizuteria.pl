export const CUSTOMER_ACCOUNT_QUERY_STALE_MS = 60_000

export const CUSTOMER_ACCOUNT_ORDERS_LIMIT = 50

export const CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT = 20

export const CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE = 10

export const CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT = 5

export const CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT = 3

export const CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT = 3

export const CUSTOMER_ACCOUNT_ORDER_FILTERS = ["all", "processing", "shipped", "delivered", "cancelled", "refunded"] as const

export type CustomerAccountOrderFilter = (typeof CUSTOMER_ACCOUNT_ORDER_FILTERS)[number]

export const CUSTOMER_ACCOUNT_QUERY_KEYS = {
  LOGIN_HISTORY: ["customer-account", "login-history"] as const,
  ORDERS: ["customer-account", "orders"] as const,
  ORDER_BY_ID: ["customer-account", "order"] as const,
  OVERVIEW: ["customer-account", "overview"] as const,
  PROFILE: ["customer-account", "profile"] as const,
  SESSIONS: ["customer-account", "sessions"] as const,
} as const

export const CUSTOMER_ACCOUNT_MUTATION_KEYS = {
  REVOKE_OTHER_SESSIONS: ["customer-account", "revokeOtherCustomerSessions"] as const,
  REVOKE_SESSION: ["customer-account", "revokeCustomerSession"] as const,
  UPDATE_PHONE: ["customer-account", "updateCustomerPhone"] as const,
} as const

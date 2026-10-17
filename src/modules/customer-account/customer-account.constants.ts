export const CUSTOMER_ACCOUNT_QUERY_STALE_MS = 60_000

export const CUSTOMER_ACCOUNT_ORDERS_LIMIT = 50

export const CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE = 10

export const CUSTOMER_ACCOUNT_LOGIN_STATUS = {
  FAILED: "failed",
  SUCCESS: "success",
} as const

export const CUSTOMER_ACCOUNT_LOGIN_STATUSES = [CUSTOMER_ACCOUNT_LOGIN_STATUS.SUCCESS, CUSTOMER_ACCOUNT_LOGIN_STATUS.FAILED] as const

export type CustomerAccountLoginStatus = (typeof CUSTOMER_ACCOUNT_LOGIN_STATUSES)[number]

export const CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE = 10

export const CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT = 5

export const CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT = 3

export const CUSTOMER_ACCOUNT_RECOMMENDED_CATEGORY_LIMIT = 2

export const CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT = 3

export const CUSTOMER_ACCOUNT_ORDER_FILTERS = ["all", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const

export type CustomerAccountOrderFilter = (typeof CUSTOMER_ACCOUNT_ORDER_FILTERS)[number]

export type CustomerAccountOrderStatus = Exclude<CustomerAccountOrderFilter, "all"> | "pending"

export const SESSION_TABLE_COLUMN_ID = {
  actions: "actions",
  browser: "browser",
  device: "device",
  ipAddress: "ipAddress",
  lastActive: "lastActive",
  signedIn: "signedIn",
} as const

export const SESSION_TABLE_COLUMN_SIZE = {
  actions: 48,
  browser: 180,
  device: 260,
  ipAddress: 180,
  lastActive: 180,
  signedIn: 200,
} as const

export const LOGIN_HISTORY_TABLE_COLUMN_ID = {
  createdAt: "createdAt",
  ipAddress: "ipAddress",
  status: "status",
} as const

export const LOGIN_HISTORY_TABLE_COLUMN_SIZE = {
  createdAt: 240,
  ipAddress: 240,
  status: 220,
} as const

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

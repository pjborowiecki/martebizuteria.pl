const MILLISECONDS_PER_SECOND = 1000

const SECONDS_PER_MINUTE = 60

const MINUTES_PER_HOUR = 60

const HOURS_PER_DAY = 24

const AUDIT_LOG_RANGE_DAYS_7 = 7

const AUDIT_LOG_RANGE_DAYS_30 = 30

const MILLISECONDS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export const ADMIN_AUDIT_LOG_PAGE_SIZE = 100

export const AUDIT_LOG_QUERY_STALE_MS = 30_000

export const AUDIT_LOG_CATEGORIES = ["orders", "email", "customers", "catalog", "content", "settings", "auth"] as const

export type AuditLogCategory = (typeof AUDIT_LOG_CATEGORIES)[number]

export const AUDIT_LOG_CATEGORY_FILTER = {
  ALL: "all",
  ...Object.fromEntries(AUDIT_LOG_CATEGORIES.map((category) => [category.toUpperCase(), category])),
} as const

export type AuditLogCategoryFilter = AuditLogCategory | typeof AUDIT_LOG_CATEGORY_FILTER.ALL

export const AUDIT_LOG_SEVERITIES = ["info", "success", "warning", "error"] as const

export type AuditLogSeverity = (typeof AUDIT_LOG_SEVERITIES)[number]

export const AUDIT_LOG_ACTOR_ROLES = ["admin", "customer", "system", "unknown"] as const

export type AuditLogActorRole = (typeof AUDIT_LOG_ACTOR_ROLES)[number]

export const AUDIT_LOG_DATE_RANGE = {
  ALL: "all",
  DAYS_30: "30d",
  DAYS_7: "7d",
  TODAY: "today",
} as const

export type AuditLogDateRange = (typeof AUDIT_LOG_DATE_RANGE)[keyof typeof AUDIT_LOG_DATE_RANGE]

export const AUDIT_LOG_DATE_RANGE_MS = {
  DAYS_30: AUDIT_LOG_RANGE_DAYS_30 * MILLISECONDS_PER_DAY,
  DAYS_7: AUDIT_LOG_RANGE_DAYS_7 * MILLISECONDS_PER_DAY,
} as const

export const AUDIT_LOG_ACTION = {
  ATTRIBUTE_CREATED: "attribute.created",
  ATTRIBUTE_DELETED: "attribute.deleted",
  ATTRIBUTE_UPDATED: "attribute.updated",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  CATEGORY_CREATED: "category.created",
  CATEGORY_DELETED: "category.deleted",
  CATEGORY_UPDATED: "category.updated",
  COLLECTION_CREATED: "collection.created",
  COLLECTION_DELETED: "collection.deleted",
  COLLECTION_UPDATED: "collection.updated",
  CONTENT_PAGE_UPDATED: "content_page.updated",
  CUSTOMER_CART_ABANDONED: "customer.cart_abandoned",
  CUSTOMER_CART_ITEM_ADDED: "customer.cart_item_added",
  CUSTOMER_PAGE_VIEWED: "customer.page_viewed",
  CUSTOMER_REGISTERED: "customer.registered",
  DISCOUNT_CREATED: "discount.created",
  DISCOUNT_DELETED: "discount.deleted",
  DISCOUNT_REDEEMED: "discount.redeemed",
  DISCOUNT_UPDATED: "discount.updated",
  EMAIL_DEFERRED: "email.deferred",
  EMAIL_FAILED: "email.failed",
  EMAIL_SENT: "email.sent",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_DISPUTE_CLOSED: "order.dispute_closed",
  ORDER_DISPUTE_OPENED: "order.dispute_opened",
  ORDER_FULFILLMENT_STARTED: "order.fulfillment_started",
  ORDER_PAYMENT_CAPTURED: "order.payment_captured",
  ORDER_PAYMENT_FAILED: "order.payment_failed",
  ORDER_PLACED: "order.placed",
  ORDER_REFUND_INITIATED: "order.refund_initiated",
  ORDER_RELEASED: "order.released",
  ORDER_SHIPPED: "order.shipped",
  PRODUCT_CREATED: "product.created",
  PRODUCT_DELETED: "product.deleted",
  PRODUCT_UPDATED: "product.updated",
  SETTINGS_UPDATED: "settings.updated",
} as const

export type AuditLogAction = (typeof AUDIT_LOG_ACTION)[keyof typeof AUDIT_LOG_ACTION]

export const SEVERITY_DOT_COLORS: Record<AuditLogSeverity, string> = {
  error: "bg-red-500",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
}

export const SEVERITY_BADGE_COLORS: Record<AuditLogSeverity, string> = {
  error: "bg-red-500/10 text-red-500",
  info: "bg-blue-500/10 text-blue-600",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
}

export const ACTOR_ROLE_COLORS: Record<AuditLogActorRole, string> = {
  admin: "bg-foreground text-background",
  customer: "bg-blue-500/10 text-blue-600",
  system: "bg-secondary text-muted-foreground",
  unknown: "bg-red-500/10 text-red-500",
}

export const AUDIT_LOG_TABLE_COLUMN_ID = {
  action: "action",
  actions: "actions",
  actor: "actor",
  category: "category",
  detail: "detail",
  ip: "ip",
  severity: "severity",
  target: "target",
  timestamp: "timestamp",
} as const

export const AUDIT_LOG_TABLE_COLUMN_SIZE = {
  action: 180,
  actions: 48,
  actor: 150,
  category: 110,
  detail: 280,
  ip: 110,
  severity: 90,
  target: 520,
  targetMin: 200,
  timestamp: 170,
  timestampMax: 320,
} as const

export const AUDIT_LOG_TABLE_COLUMN_PINNING = {
  end: [AUDIT_LOG_TABLE_COLUMN_ID.actions],
  start: ["select", AUDIT_LOG_TABLE_COLUMN_ID.severity, AUDIT_LOG_TABLE_COLUMN_ID.action],
}

export const AUDIT_LOG_TABLE_DEFAULT_COLUMN_VISIBILITY = {} as const

export const AUDIT_LOG_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "audit-log"] as const,
    PAGE: ["admin", "audit-log", "page"] as const,
    STATS: ["admin", "audit-log", "stats"] as const,
  },
} as const

export const AUDIT_LOG_MUTATION_KEYS = {
  DELETE: ["audit-log", "deleteAuditLogs"] as const,
} as const

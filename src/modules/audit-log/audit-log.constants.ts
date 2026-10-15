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

export const AUDIT_LOG_ACTION = {
  ATTRIBUTE_CREATED: "attribute.created",
  ATTRIBUTE_DELETED: "attribute.deleted",
  ATTRIBUTE_UPDATED: "attribute.updated",
  AUDIT_LOG_DELETED: "audit_log.deleted",
  AUTH_EMAIL_CHANGED: "auth.email_changed",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_PASSWORD_CHANGED: "auth.password_changed",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  AUTH_ROLE_CHANGED: "auth.role_changed",
  AUTH_SESSIONS_REVOKED: "auth.sessions_revoked",
  AUTH_TWO_FACTOR_DISABLED: "auth.two_factor_disabled",
  AUTH_TWO_FACTOR_ENABLED: "auth.two_factor_enabled",
  AUTH_USER_BANNED: "auth.user_banned",
  AUTH_USER_UNBANNED: "auth.user_unbanned",
  CATEGORY_CREATED: "category.created",
  CATEGORY_DELETED: "category.deleted",
  CATEGORY_UPDATED: "category.updated",
  COLLECTION_CREATED: "collection.created",
  COLLECTION_DELETED: "collection.deleted",
  COLLECTION_UPDATED: "collection.updated",
  CONTENT_PAGE_UPDATED: "content_page.updated",
  CUSTOMER_CART_ABANDONED: "customer.cart_abandoned",
  CUSTOMER_CART_ITEM_ADDED: "customer.cart_item_added",
  CUSTOMER_DELETED: "customer.deleted",
  CUSTOMER_DELETION_FAILED: "customer.deletion_failed",
  CUSTOMER_PAGE_VIEWED: "customer.page_viewed",
  CUSTOMER_REGISTERED: "customer.registered",
  CUSTOMER_UPDATED: "customer.updated",
  DISCOUNT_CREATED: "discount.created",
  DISCOUNT_DELETED: "discount.deleted",
  DISCOUNT_REDEEMED: "discount.redeemed",
  DISCOUNT_UPDATED: "discount.updated",
  EMAIL_DEFERRED: "email.deferred",
  EMAIL_FAILED: "email.failed",
  EMAIL_RESEND_REQUESTED: "email.resend_requested",
  EMAIL_SENT: "email.sent",
  IMAGE_UPLOADED: "image.uploaded",
  NEWSLETTER_SENT: "newsletter.sent",
  NEWSLETTER_SUBSCRIBER_ERASED: "newsletter.subscriber_erased",
  NEWSLETTER_SUBSCRIBER_UNSUBSCRIBED: "newsletter.subscriber_unsubscribed",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_DELIVERED: "order.delivered",
  ORDER_DISPUTE_CLOSED: "order.dispute_closed",
  ORDER_DISPUTE_OPENED: "order.dispute_opened",
  ORDER_FULFILLMENT_FAILED: "order.fulfillment_failed",
  ORDER_FULFILLMENT_STARTED: "order.fulfillment_started",
  ORDER_PAYMENT_CAPTURED: "order.payment_captured",
  ORDER_PAYMENT_FAILED: "order.payment_failed",
  ORDER_PLACED: "order.placed",
  ORDER_REFUND_INITIATED: "order.refund_initiated",
  ORDER_REFUND_REQUESTED: "order.refund_requested",
  ORDER_RELEASED: "order.released",
  ORDER_RESTOCKED: "order.restocked",
  ORDER_SHIPMENT_CREATED: "order.shipment_created",
  ORDER_SHIPPED: "order.shipped",
  ORDER_WITHDRAWAL_RECEIVED: "order.withdrawal_received",
  PRODUCT_CREATED: "product.created",
  PRODUCT_DELETED: "product.deleted",
  PRODUCT_UPDATED: "product.updated",
  SALES_PAUSED: "sales.paused",
  SALES_RESUMED: "sales.resumed",
  SETTINGS_UPDATED: "settings.updated",
} as const

export type AuditLogAction = (typeof AUDIT_LOG_ACTION)[keyof typeof AUDIT_LOG_ACTION]

export const AUDIT_EMAIL_KIND = {
  ACCOUNT_DELETED: "account-deleted",
  CHANGE_EMAIL: "change-email",
  NEWSLETTER_ALREADY_SUBSCRIBED: "newsletter-already-subscribed",
  NEWSLETTER_CAMPAIGN: "newsletter-campaign",
  NEWSLETTER_CONFIRMATION: "newsletter-confirmation",
  NEWSLETTER_SUBSCRIPTION: "newsletter-subscription",
  NEWSLETTER_TEST: "newsletter-test",
  NEW_ORDER: "new-order",
  ORDER_CANCELLED: "order-cancelled",
  ORDER_CONFIRMATION: "order-confirmation",
  ORDER_IN_PROGRESS: "order-in-progress",
  ORDER_REFUNDED: "order-refunded",
  ORDER_SHIPPED: "order-shipped",
  ORDER_TRACKING: "order-tracking",
  ORDER_WITHDRAWAL: "order-withdrawal",
  ORDER_WITHDRAWAL_NOTICE: "order-withdrawal-notice",
  PASSWORD_CHANGED: "password-changed",
  PAYMENT_FAILED: "payment-failed",
  RESET_PASSWORD: "reset-password",
  VERIFICATION: "verification",
} as const

export type AuditEmailKind = (typeof AUDIT_EMAIL_KIND)[keyof typeof AUDIT_EMAIL_KIND]

export const AUDIT_LOG_MONEY_FIELDS: ReadonlySet<string> = new Set(["amount", "refundedAmount"])

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

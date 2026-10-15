import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const NEWSLETTER_STATUSES = ["pending", "confirmed", "unsubscribed"] as const

export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number]

export const NEWSLETTER_STATUS = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  UNSUBSCRIBED: "unsubscribed",
} as const satisfies Record<string, NewsletterStatus>

export const NEWSLETTER_SOURCES = ["landing", "checkout", "account", "admin"] as const

export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number]

export const NEWSLETTER_SOURCE = {
  ACCOUNT: "account",
  ADMIN: "admin",
  CHECKOUT: "checkout",
  LANDING: "landing",
} as const satisfies Record<string, NewsletterSource>

export const NEWSLETTER_OUTCOME = {
  ALREADY_CONFIRMED: "alreadyConfirmed",
  CONFIRMATION_FAILED: "confirmationFailed",
  CONFIRMATION_SENT: "confirmationSent",
} as const

export type NewsletterOutcome = (typeof NEWSLETTER_OUTCOME)[keyof typeof NEWSLETTER_OUTCOME]

export const NEWSLETTER_TOKEN_RESULT = {
  ALREADY_DONE: "alreadyDone",
  INVALID: "invalid",
  OK: "ok",
} as const

export type NewsletterTokenResult = (typeof NEWSLETTER_TOKEN_RESULT)[keyof typeof NEWSLETTER_TOKEN_RESULT]

export const NEWSLETTER_EMAIL_MAX_LENGTH = 320

export const ADMIN_NEWSLETTER_PAGE_SIZE = 50

export const NEWSLETTER_QUERY_STALE_MS = 60_000

export const NEWSLETTER_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "newsletter"] as const,
    PAGE: ["admin", "newsletter", "page"] as const,
    STATS: ["admin", "newsletter", "stats"] as const,
  },
  OWN_SUBSCRIPTION: ["newsletter", "ownSubscription"] as const,
} as const

export const NEWSLETTER_MUTATION_KEYS = {
  CONFIRM: ["newsletter", "confirmSubscription"] as const,
  ERASE_SUBSCRIBER: ["newsletter", "eraseSubscriber"] as const,
  SUBSCRIBE: ["newsletter", "subscribe"] as const,
  UNSUBSCRIBE: ["newsletter", "unsubscribe"] as const,
  UNSUBSCRIBE_OWN: ["newsletter", "unsubscribeOwn"] as const,
  UNSUBSCRIBE_SUBSCRIBER: ["newsletter", "unsubscribeSubscriber"] as const,
} as const

export const NEWSLETTER_ERROR_CODES = {
  SUBSCRIBER_NOT_FOUND: "NEWSLETTER_SUBSCRIBER_NOT_FOUND",
} as const

export const ADMIN_NEWSLETTER_TABLE_COLUMN_ID = {
  account: "account",
  actions: "actions",
  confirmedAt: "confirmedAt",
  createdAt: "createdAt",
  email: "email",
  locale: "locale",
  recordId: "recordId",
  source: "source",
  status: "status",
  unsubscribedAt: "unsubscribedAt",
} as const

export const ADMIN_NEWSLETTER_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.recordId]: false,
  [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.unsubscribedAt]: false,
} as const

export const ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE = {
  account: 150,
  actions: 48,
  confirmedAt: 140,
  createdAt: 140,
  email: 280,
  locale: 110,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  source: 160,
  status: 190,
  unsubscribedAt: 140,
} as const

export const ADMIN_NEWSLETTER_TABLE_COLUMN_PINNING = {
  end: [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.actions],
  start: [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.email],
}

export const NEWSLETTER_STATUS_BADGE_STYLES: Record<NewsletterStatus, NewsletterBadgeStyle> = {
  confirmed: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
  pending: { className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", variant: "outline" },
  unsubscribed: { variant: "secondary" },
}

export interface NewsletterBadgeStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}

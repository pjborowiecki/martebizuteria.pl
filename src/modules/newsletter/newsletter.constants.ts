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
  SUBSCRIBE: ["newsletter", "subscribe"] as const,
  UNSUBSCRIBE: ["newsletter", "unsubscribe"] as const,
  UNSUBSCRIBE_OWN: ["newsletter", "unsubscribeOwn"] as const,
} as const

export const NEWSLETTER_STATUS_BADGE_STYLES: Record<NewsletterStatus, NewsletterBadgeStyle> = {
  confirmed: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
  pending: { className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", variant: "outline" },
  unsubscribed: { variant: "secondary" },
}

export interface NewsletterBadgeStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}

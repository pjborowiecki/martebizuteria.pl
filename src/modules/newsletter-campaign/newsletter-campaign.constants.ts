import { type NewsletterBadgeStyle } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

export const NEWSLETTER_CAMPAIGN_STATUSES = ["sending", "sent", "failed"] as const

export type NewsletterCampaignStatus = (typeof NEWSLETTER_CAMPAIGN_STATUSES)[number]

export const NEWSLETTER_CAMPAIGN_STATUS = {
  FAILED: "failed",
  SENDING: "sending",
  SENT: "sent",
} as const satisfies Record<string, NewsletterCampaignStatus>

export const NEWSLETTER_CAMPAIGN_COLUMN_LENGTH = {
  body: 20_000,
  subject: 150,
} as const

export const NEWSLETTER_LINK_PATTERN = /^(?:https:\/\/|mailto:|tel:)[^\s()<>\\]*$/u

export const NEWSLETTER_CAMPAIGN_VALIDATION_KEYS = {
  bodyRequired: "composer.validation.bodyRequired",
  bodyTooLong: "composer.validation.bodyTooLong",
  bodyUnsupported: "composer.validation.bodyUnsupported",
  subjectRequired: "composer.validation.subjectRequired",
  subjectTooLong: "composer.validation.subjectTooLong",
} as const

export const NEWSLETTER_CAMPAIGN_ERROR_CODES = {
  ALREADY_SENT: "NEWSLETTER_ALREADY_SENT",
  NO_RECIPIENTS: "NEWSLETTER_NO_RECIPIENTS",
} as const

export const NEWSLETTER_BATCH_SIZE = 100

export const NEWSLETTER_NEXT_BATCH_DELAY_SECONDS = 1

export const NEWSLETTER_RETRY_DELAY_SECONDS = 60

export const NEWSLETTER_SEND_ATTEMPTS = 3

export const NEWSLETTER_QUEUE_PREFIX = "martebizuteria-newsletter"

export const ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT = 50

export const NEWSLETTER_CAMPAIGN_QUERY_STALE_MS = 30_000

export const NEWSLETTER_CAMPAIGN_QUERY_KEYS = {
  ADMIN: {
    LIST: ["admin", "newsletter-campaign", "list"] as const,
  },
} as const

export const NEWSLETTER_CAMPAIGN_MUTATION_KEYS = {
  SEND: ["newsletter-campaign", "send"] as const,
  SEND_TEST: ["newsletter-campaign", "sendTest"] as const,
} as const

export const NEWSLETTER_CAMPAIGN_STATUS_BADGE_STYLES: Record<NewsletterCampaignStatus, NewsletterBadgeStyle> = {
  failed: { variant: "destructive" },
  sending: { className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400", variant: "outline" },
  sent: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
}

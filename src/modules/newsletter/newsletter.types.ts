import { type NewsletterOutcome, type NewsletterStatus, type NewsletterTokenResult } from "~/src/modules/newsletter/newsletter.constants"
import { type newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"

interface AdminNewsletterListItem {
  readonly confirmedAt: Date | undefined
  readonly createdAt: Date
  readonly email: string
  readonly id: string
  readonly locale: string
  readonly source: string
  readonly status: NewsletterStatus
  readonly unsubscribedAt: Date | undefined
}

interface AdminNewsletterStats {
  readonly confirmed: number
  readonly pending: number
  readonly total: number
  readonly unsubscribed: number
}

interface NewsletterSubscribeFormValues {
  readonly email: string
}

export interface Newsletter {
  adminListItem: AdminNewsletterListItem
  adminStats: AdminNewsletterStats
  insert: typeof newsletterSubscriber.$inferInsert
  outcome: { readonly outcome: NewsletterOutcome }
  select: typeof newsletterSubscriber.$inferSelect
  subscribeFormValues: NewsletterSubscribeFormValues
  tokenResult: { readonly email: string | undefined; readonly result: NewsletterTokenResult }
}

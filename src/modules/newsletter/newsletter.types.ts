import { type z } from "zod/v4"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import {
  type NewsletterOutcome,
  type NewsletterSource,
  type NewsletterStatus,
  type NewsletterTokenResult,
} from "~/src/modules/newsletter/newsletter.constants"
import { type newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"
import { type newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

interface AdminNewsletterListItem {
  readonly confirmedAt: Date | undefined
  readonly createdAt: Date
  readonly email: string
  readonly id: string
  readonly locale: SupportedLocale
  readonly source: NewsletterSource
  readonly status: NewsletterStatus
  readonly unsubscribedAt: Date | undefined
  readonly userId: string | undefined
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
  adminExportInput: z.input<(typeof newsletterZodSchemas)["adminNewsletterExportInput"]>
  adminListItem: AdminNewsletterListItem
  adminStats: AdminNewsletterStats
  insert: typeof newsletterSubscriber.$inferInsert
  outcome: { readonly outcome: NewsletterOutcome }
  select: typeof newsletterSubscriber.$inferSelect
  subscribeFormValues: NewsletterSubscribeFormValues
  tokenResult: { readonly email: string | undefined; readonly result: NewsletterTokenResult }
}

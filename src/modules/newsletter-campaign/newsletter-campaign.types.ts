import { type z } from "zod/v4"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type newsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.schema"
import { type newsletterCampaignZodSchemas } from "~/src/modules/newsletter-campaign/newsletter-campaign.zod"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

interface NewsletterRecipient {
  readonly email: string
  readonly locale: SupportedLocale
  readonly unsubscribeToken: string | undefined
}

export interface NewsletterCampaign {
  adminListItem: Pick<
    NewsletterCampaign["select"],
    "completedAt" | "createdAt" | "failure" | "id" | "recipientCount" | "sentCount" | "status" | "subjects"
  >
  composeValues: z.infer<(typeof newsletterCampaignZodSchemas)["composeValues"]>
  insert: typeof newsletterCampaign.$inferInsert
  localeMap: ProductAttribute["localeMap"]
  queueMessage: { readonly campaignId: string }
  recipient: NewsletterRecipient
  select: typeof newsletterCampaign.$inferSelect
  sendInput: z.infer<(typeof newsletterCampaignZodSchemas)["sendInput"]>
}

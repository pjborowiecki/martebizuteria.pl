import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { NEWSLETTER_CAMPAIGN_STATUSES } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

export const newsletterCampaign = sqliteTable(
  "newsletter_campaign",
  {
    bodies: text("bodies", { mode: "json" }).$type<NewsletterCampaign["localeMap"]>().notNull(),
    completedAt: timestamp("completed_at"),
    failure: text("failure"),
    id: text("id").primaryKey(),
    lastRecipientId: text("last_recipient_id"),
    origin: text("origin").notNull(),
    recipientCount: integer("recipient_count").notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    status: text("status", { enum: NEWSLETTER_CAMPAIGN_STATUSES }).notNull(),
    subjects: text("subjects", { mode: "json" }).$type<NewsletterCampaign["localeMap"]>().notNull(),
    ...timestamps(),
  },
  (table) => [index("newsletter_campaign_createdAt_idx").on(table.createdAt)],
)

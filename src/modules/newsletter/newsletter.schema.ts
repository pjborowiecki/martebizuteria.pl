import { relations } from "drizzle-orm"
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_SOURCES, NEWSLETTER_STATUSES } from "~/src/modules/newsletter/newsletter.constants"
import { user } from "~/src/modules/user/user.schema"

export const newsletterSubscriber = sqliteTable(
  "newsletter_subscriber",
  {
    confirmedAt: timestamp("confirmed_at"),
    email: text("email", { length: 320 }).notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locale: text("locale", { enum: I18N.SUPPORTED_LOCALES }).notNull(),
    source: text("source", { enum: NEWSLETTER_SOURCES }).notNull(),
    status: text("status", { enum: NEWSLETTER_STATUSES }).notNull(),
    token: text("token").notNull(),
    unsubscribedAt: timestamp("unsubscribed_at"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("newsletter_subscriber_email_unique").on(table.email),
    uniqueIndex("newsletter_subscriber_token_unique").on(table.token),
    index("newsletter_subscriber_status_idx").on(table.status),
    index("newsletter_subscriber_createdAt_idx").on(table.createdAt),
    index("newsletter_subscriber_userId_idx").on(table.userId),
  ],
)

export const newsletterSubscriberRelations = relations(newsletterSubscriber, ({ one }) => ({
  user: one(user, {
    fields: [newsletterSubscriber.userId],
    references: [user.id],
  }),
}))

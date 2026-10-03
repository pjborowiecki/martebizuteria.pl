import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { localeField, pageField, pageSizeField } from "~/src/modules/_core/utils/zod-fields"
import { NEWSLETTER_EMAIL_MAX_LENGTH, NEWSLETTER_SOURCES } from "~/src/modules/newsletter/newsletter.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const TOKEN_MIN_LENGTH = 16

const TOKEN_MAX_LENGTH = 128

export const newsletterZodSchemas = {
  adminNewsletterPageInput: zod.object({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: zod.string().optional(),
  }),
  insert: createInsertSchema(newsletterSubscriber),
  select: createSelectSchema(newsletterSubscriber),
  subscribeInput: zod.object({
    email: zod.email({ message: "validation.emailInvalid" }).max(NEWSLETTER_EMAIL_MAX_LENGTH),
    locale: localeField.optional(),
    source: zod.enum(NEWSLETTER_SOURCES).optional(),
  }),
  tokenInput: zod.object({
    token: zod.string().trim().min(TOKEN_MIN_LENGTH).max(TOKEN_MAX_LENGTH),
  }),
  update: createUpdateSchema(newsletterSubscriber),
}

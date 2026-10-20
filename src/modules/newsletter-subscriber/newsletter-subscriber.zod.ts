import zod from "zod/v4"

import { localeField, pageField, pageSizeField, uuidField } from "~/src/modules/_core/utils/zod-fields"
import {
  NEWSLETTER_EMAIL_MAX_LENGTH,
  NEWSLETTER_SOURCES,
  NEWSLETTER_STATUSES,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

const TOKEN_MIN_LENGTH = 16

const TOKEN_MAX_LENGTH = 128

const adminSubscribersFilters = zod.object({
  search: zod.string().optional(),
  status: zod.enum(NEWSLETTER_STATUSES).optional(),
})

export const newsletterZodSchemas = {
  adminNewsletterExportInput: adminSubscribersFilters,
  adminNewsletterPageInput: adminSubscribersFilters.extend({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
  }),
  subscribeFormValues: zod.object({
    email: zod.string().trim().pipe(zod.email().max(NEWSLETTER_EMAIL_MAX_LENGTH)),
  }),
  subscribeInput: zod.object({
    email: zod.email({ message: "validation.emailInvalid" }).max(NEWSLETTER_EMAIL_MAX_LENGTH),
    locale: localeField.optional(),
    source: zod.enum(NEWSLETTER_SOURCES).optional(),
  }),
  subscriberIdInput: zod.object({ id: uuidField }),
  tokenInput: zod.object({
    token: zod.string().trim().min(TOKEN_MIN_LENGTH).max(TOKEN_MAX_LENGTH),
  }),
}

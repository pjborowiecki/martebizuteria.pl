import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { uuidField } from "~/src/modules/_core/utils/zod-fields"
import { hasOnlyMarkdownLinksMatching } from "~/src/modules/content-page/content-page.validation.utils"
import {
  NEWSLETTER_CAMPAIGN_COLUMN_LENGTH,
  NEWSLETTER_CAMPAIGN_VALIDATION_KEYS,
  NEWSLETTER_LINK_PATTERN,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"

const subjectField = zod
  .string()
  .trim()
  .min(1, NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.subjectRequired)
  .max(NEWSLETTER_CAMPAIGN_COLUMN_LENGTH.subject, NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.subjectTooLong)

const bodyField = zod
  .string()
  .trim()
  .min(1, NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyRequired)
  .max(NEWSLETTER_CAMPAIGN_COLUMN_LENGTH.body, NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyTooLong)
  .refine(hasOnlyMarkdownLinksMatching(NEWSLETTER_LINK_PATTERN), NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyUnsupported)

const composeValues = zod.object({
  bodies: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), bodyField),
  subjects: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), subjectField),
})

export const newsletterCampaignZodSchemas = {
  composeValues,
  sendInput: composeValues.extend({ id: uuidField }),
}

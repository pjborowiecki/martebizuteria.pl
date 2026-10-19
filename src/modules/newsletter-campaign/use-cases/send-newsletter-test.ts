import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_EMAIL_KIND } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { NEWSLETTER_CAMPAIGN_MUTATION_KEYS } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { newsletterCampaignZodSchemas } from "~/src/modules/newsletter-campaign/newsletter-campaign.zod"
import { sendNewsletterBatch } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-batch.server"

import { resolveRequestOrigin } from "~/src/lib/request"

export const sendNewsletterTest = createServerFn({ method: "POST" })
  .middleware([authorized({ content: ["update"] })])
  .validator((input: zod.input<typeof newsletterCampaignZodSchemas.composeValues>) =>
    newsletterCampaignZodSchemas.composeValues.parse(input),
  )
  .handler(async ({ context, data: { bodies, subjects } }): Promise<{ readonly email: string }> => {
    const { email } = context.auth.user
    const failure = await sendNewsletterBatch({
      content: { bodies, origin: resolveRequestOrigin(getRequest()), subjects },
      recipients: I18N.SUPPORTED_LOCALES.map((locale) => ({ email, locale, unsubscribeToken: undefined })),
    })
    if (failure !== undefined) {
      console.error(`[Newsletter] Failed to send the test newsletter to ${email}: ${failure}`)
      recordEmailFailedAudit(email, { detail: failure, metadata: { emailKind: AUDIT_EMAIL_KIND.NEWSLETTER_TEST } })
      throw new AppError(ERROR_CODES.INTERNAL_ERROR)
    }

    return { email }
  })

export const sendNewsletterTestMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof sendNewsletterTest>[0]["data"]) => sendNewsletterTest({ data }),
  mutationKey: NEWSLETTER_CAMPAIGN_MUTATION_KEYS.SEND_TEST,
})

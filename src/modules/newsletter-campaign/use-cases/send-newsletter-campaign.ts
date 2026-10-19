import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordNewsletterSentAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { deleteUnsentNewsletterCampaign, insertNewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.accessors"
import {
  NEWSLETTER_CAMPAIGN_ERROR_CODES,
  NEWSLETTER_CAMPAIGN_MUTATION_KEYS,
  NEWSLETTER_CAMPAIGN_QUERY_KEYS,
  NEWSLETTER_CAMPAIGN_STATUS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { newsletterCampaignZodSchemas } from "~/src/modules/newsletter-campaign/newsletter-campaign.zod"
import { enqueueNewsletterCampaign } from "~/src/modules/newsletter-campaign/use-cases/process-newsletter-queue.server"
import { countConfirmedSubscribers } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"

import { resolveRequestOrigin } from "~/src/lib/request"

export const sendNewsletterCampaign = createServerFn({ method: "POST" })
  .middleware([authorized({ content: ["update"] })])
  .validator((input: zod.input<typeof newsletterCampaignZodSchemas.sendInput>) => newsletterCampaignZodSchemas.sendInput.parse(input))
  .handler(async ({ data: { bodies, id, subjects } }): Promise<{ readonly recipientCount: number }> => {
    const recipientCount = await countConfirmedSubscribers()
    if (recipientCount === 0) {
      throw new AppError(ERROR_CODES.CONFLICT, NEWSLETTER_CAMPAIGN_ERROR_CODES.NO_RECIPIENTS)
    }

    const origin = resolveRequestOrigin(getRequest())
    const created = await insertNewsletterCampaign({
      bodies,
      id,
      origin,
      recipientCount,
      status: NEWSLETTER_CAMPAIGN_STATUS.SENDING,
      subjects,
    })
    if (!created) {
      throw new AppError(ERROR_CODES.CONFLICT, NEWSLETTER_CAMPAIGN_ERROR_CODES.ALREADY_SENT)
    }

    try {
      await enqueueNewsletterCampaign(id)
    } catch (error) {
      await deleteUnsentNewsletterCampaign(id)
      throw error
    }

    recordNewsletterSentAudit(subjects[I18N.DEFAULT_LOCALE], {
      metadata: { recipientCount },
      resourceId: id,
    })
    scheduleRealtimeInvalidation({ admin: [NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST] })

    return { recipientCount }
  })

export const sendNewsletterCampaignMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof sendNewsletterCampaign>[0]["data"]) => sendNewsletterCampaign({ data }),
  mutationKey: NEWSLETTER_CAMPAIGN_MUTATION_KEYS.SEND,
})

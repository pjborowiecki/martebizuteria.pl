import { env } from "cloudflare:workers"

import { publishRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"

import { AUDIT_EMAIL_KIND } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import {
  completeNewsletterCampaign,
  failNewsletterCampaign,
  getNewsletterCampaignById,
  recordNewsletterBatchSent,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.accessors"
import {
  NEWSLETTER_BATCH_SIZE,
  NEWSLETTER_CAMPAIGN_QUERY_KEYS,
  NEWSLETTER_CAMPAIGN_STATUS,
  NEWSLETTER_NEXT_BATCH_DELAY_SECONDS,
  NEWSLETTER_RETRY_DELAY_SECONDS,
  NEWSLETTER_SEND_ATTEMPTS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { sendNewsletterBatch } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-batch.server"
import { getConfirmedSubscribersAfter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"

import { sendIncidentAlert } from "~/src/lib/incident-alert.server"

type NewsletterQueueMessage = NewsletterCampaign["queueMessage"]

export const enqueueNewsletterCampaign = async (campaignId: string): Promise<void> => {
  const message: NewsletterQueueMessage = { campaignId }
  await env.NEWSLETTER_QUEUE.send(message, { contentType: "json", delaySeconds: NEWSLETTER_NEXT_BATCH_DELAY_SECONDS })
}

const batchIdempotencyKey = ({ id, lastRecipientId }: Pick<NewsletterCampaign["select"], "id" | "lastRecipientId">): string =>
  lastRecipientId === null ? `newsletter-${id}` : `newsletter-${id}-after-${lastRecipientId}`

const refreshAdminCampaigns = (): Promise<void> => publishRealtimeInvalidation({ admin: [NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST] })

const sendNextBatch = async (campaign: NewsletterCampaign["select"]): Promise<string | undefined> => {
  const subscribers = await getConfirmedSubscribersAfter(campaign.lastRecipientId, NEWSLETTER_BATCH_SIZE)
  const last = subscribers.at(-1)
  if (last === undefined) {
    await completeNewsletterCampaign(campaign.id)

    return undefined
  }

  const failure = await sendNewsletterBatch({
    content: campaign,
    idempotencyKey: batchIdempotencyKey(campaign),
    recipients: subscribers.map(({ email, locale, token }) => ({ email, locale, unsubscribeToken: token })),
  })
  if (failure !== undefined) {
    return failure
  }

  const finished = subscribers.length < NEWSLETTER_BATCH_SIZE
  const advanced = await recordNewsletterBatchSent({ campaign, delivered: subscribers.length, finished, lastRecipientId: last.id })
  if (advanced && !finished) {
    await enqueueNewsletterCampaign(campaign.id)
  }

  return undefined
}

const retryOrStop = async (message: Message<NewsletterQueueMessage>, failure: string): Promise<void> => {
  const { campaignId } = message.body
  if (message.attempts < NEWSLETTER_SEND_ATTEMPTS) {
    console.warn(`[Newsletter] Campaign ${campaignId} will retry its batch after attempt ${String(message.attempts)}: ${failure}`)
    message.retry({ delaySeconds: NEWSLETTER_RETRY_DELAY_SECONDS })

    return
  }

  console.error(`[Newsletter] Campaign ${campaignId} stopped after ${String(message.attempts)} attempts: ${failure}`)
  await failNewsletterCampaign(campaignId, failure)
  recordEmailFailedAudit(campaignId, { detail: failure, metadata: { emailKind: AUDIT_EMAIL_KIND.NEWSLETTER_CAMPAIGN } })
  await sendIncidentAlert({ detail: failure, kind: "newsletterFailed", reference: campaignId })
  await refreshAdminCampaigns()
  message.ack()
}

const deliverCampaignBatch = async (message: Message<NewsletterQueueMessage>): Promise<void> => {
  const campaign = await getNewsletterCampaignById(message.body.campaignId)
  if (campaign?.status !== NEWSLETTER_CAMPAIGN_STATUS.SENDING) {
    message.ack()

    return
  }

  const failure = await sendNextBatch(campaign)
  if (failure !== undefined) {
    await retryOrStop(message, failure)

    return
  }

  await refreshAdminCampaigns()
  message.ack()
}

const deliverSafely = async (message: Message<NewsletterQueueMessage>): Promise<void> => {
  try {
    await deliverCampaignBatch(message)
  } catch (error) {
    await retryOrStop(message, error instanceof Error ? error.message : String(error))
  }
}

export const processNewsletterQueueBatch = async (batch: MessageBatch<NewsletterQueueMessage>): Promise<void> => {
  await Promise.all(batch.messages.map((message) => deliverSafely(message)))
}

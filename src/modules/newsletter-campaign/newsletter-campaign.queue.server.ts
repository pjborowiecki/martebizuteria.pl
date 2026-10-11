import { env } from "cloudflare:workers"

import { publishRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"
import { notifyShopOfIncident } from "~/src/integrations/resend/incident-alert.notification.server"
import { sendNewsletterBatch } from "~/src/integrations/resend/newsletter-campaign.server"

import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
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
  NEWSLETTER_QUEUE_PREFIX,
  NEWSLETTER_RETRY_DELAY_SECONDS,
  NEWSLETTER_SEND_ATTEMPTS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { getConfirmedSubscribersAfter } from "~/src/modules/newsletter/newsletter.accessors"

type NewsletterQueueMessage = NewsletterCampaign["queueMessage"]

export const isNewsletterQueueBatch = <OtherMessage>(
  batch: MessageBatch<NewsletterQueueMessage | OtherMessage>,
): batch is MessageBatch<NewsletterQueueMessage> => batch.queue.startsWith(NEWSLETTER_QUEUE_PREFIX)

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
  recordEmailFailedAudit(campaignId, { detail: `Newsletter campaign — ${failure}` })
  await notifyShopOfIncident({ detail: failure, kind: "newsletterFailed", reference: campaignId })
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

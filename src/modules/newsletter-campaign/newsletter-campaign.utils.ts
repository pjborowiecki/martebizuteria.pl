import { NEWSLETTER_QUEUE_PREFIX } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

export const isNewsletterQueueBatch = <OtherMessage>(
  batch: MessageBatch<NewsletterCampaign["queueMessage"] | OtherMessage>,
): batch is MessageBatch<NewsletterCampaign["queueMessage"]> => batch.queue.startsWith(NEWSLETTER_QUEUE_PREFIX)

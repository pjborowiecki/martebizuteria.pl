import { scheduleAdminNewsletterSubscribersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordNewsletterSubscriberUnsubscribedAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { getSubscriberByToken, updateSubscriberById } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

export const unsubscribeSubscriber = async ({
  email,
  id,
  status,
}: Pick<Newsletter["select"], "email" | "id" | "status">): Promise<boolean> => {
  if (status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
    return false
  }

  await updateSubscriberById(id, {
    status: NEWSLETTER_STATUS.UNSUBSCRIBED,
    unsubscribedAt: new Date(),
    updatedAt: new Date(),
  })
  recordNewsletterSubscriberUnsubscribedAudit(email)
  scheduleAdminNewsletterSubscribersInvalidation()

  return true
}

export const unsubscribeByToken = async (token: string): Promise<Newsletter["tokenResult"]> => {
  const subscriber = await getSubscriberByToken(token)
  if (subscriber === undefined) {
    return { email: undefined, result: NEWSLETTER_TOKEN_RESULT.INVALID }
  }

  const unsubscribed = await unsubscribeSubscriber(subscriber)

  return { email: subscriber.email, result: unsubscribed ? NEWSLETTER_TOKEN_RESULT.OK : NEWSLETTER_TOKEN_RESULT.ALREADY_DONE }
}

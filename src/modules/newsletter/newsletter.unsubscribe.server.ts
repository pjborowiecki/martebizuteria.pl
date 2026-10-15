import { scheduleAdminNewsletterSubscribersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { getSubscriberByToken, updateSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const unsubscribeSubscriber = async ({ id, status }: Pick<Newsletter["select"], "id" | "status">): Promise<boolean> => {
  if (status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
    return false
  }

  await updateSubscriberById(id, {
    status: NEWSLETTER_STATUS.UNSUBSCRIBED,
    unsubscribedAt: new Date(),
    updatedAt: new Date(),
  })
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

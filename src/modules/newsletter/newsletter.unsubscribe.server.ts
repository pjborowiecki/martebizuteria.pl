import { getSubscriberByToken, updateSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const unsubscribeByToken = async (token: string): Promise<Newsletter["tokenResult"]> => {
  const subscriber = await getSubscriberByToken(token)
  if (subscriber === undefined) {
    return { email: undefined, result: NEWSLETTER_TOKEN_RESULT.INVALID }
  }

  if (subscriber.status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
    return { email: subscriber.email, result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE }
  }

  await updateSubscriberById(subscriber.id, {
    status: NEWSLETTER_STATUS.UNSUBSCRIBED,
    unsubscribedAt: new Date(),
    updatedAt: new Date(),
  })

  return { email: subscriber.email, result: NEWSLETTER_TOKEN_RESULT.OK }
}

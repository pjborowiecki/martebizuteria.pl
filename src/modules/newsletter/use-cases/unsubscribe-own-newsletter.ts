import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { getSubscriberByEmail, normalizeSubscriberEmail, updateSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_MUTATION_KEYS, NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"

export const unsubscribeOwnNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-unsubscribe-own", RATE_LIMITS.SENSITIVE), authorized()])
  .handler(async ({ context }): Promise<{ readonly unsubscribed: boolean }> => {
    const subscriber = await getSubscriberByEmail(normalizeSubscriberEmail(context.auth.user.email))
    if (subscriber === undefined || subscriber.status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
      return { unsubscribed: false }
    }

    await updateSubscriberById(subscriber.id, {
      status: NEWSLETTER_STATUS.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
      updatedAt: new Date(),
    })

    return { unsubscribed: true }
  })

export const unsubscribeOwnNewsletterMutation = mutationOptions({
  mutationFn: () => unsubscribeOwnNewsletter(),
  mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_OWN,
})

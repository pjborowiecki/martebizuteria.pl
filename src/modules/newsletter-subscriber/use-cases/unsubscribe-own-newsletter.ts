import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { getSubscriberByEmail, normalizeSubscriberEmail } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"
import { NEWSLETTER_MUTATION_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { unsubscribeSubscriber } from "~/src/modules/newsletter-subscriber/use-cases/unsubscribe-subscriber.server"

export const unsubscribeOwnNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-unsubscribe-own", RATE_LIMITS.SENSITIVE), authorized()])
  .handler(async ({ context }): Promise<{ readonly unsubscribed: boolean }> => {
    const subscriber = await getSubscriberByEmail(normalizeSubscriberEmail(context.auth.user.email))

    return { unsubscribed: subscriber !== undefined && (await unsubscribeSubscriber(subscriber)) }
  })

export const unsubscribeOwnNewsletterMutation = mutationOptions({
  mutationFn: () => unsubscribeOwnNewsletter(),
  mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_OWN,
})

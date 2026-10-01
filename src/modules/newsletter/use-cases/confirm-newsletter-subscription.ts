import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { getSubscriberByToken, updateSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_MUTATION_KEYS, NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

export const confirmNewsletterSubscription = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-confirm", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof newsletterZodSchemas.tokenInput>) => newsletterZodSchemas.tokenInput.parse(input))
  .handler(async ({ data: { token } }): Promise<Newsletter["tokenResult"]> => {
    const subscriber = await getSubscriberByToken(token)
    if (subscriber === undefined || subscriber.status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
      return { email: undefined, result: NEWSLETTER_TOKEN_RESULT.INVALID }
    }

    if (subscriber.status === NEWSLETTER_STATUS.CONFIRMED) {
      return { email: subscriber.email, result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE }
    }

    await updateSubscriberById(subscriber.id, {
      confirmedAt: new Date(),
      status: NEWSLETTER_STATUS.CONFIRMED,
      updatedAt: new Date(),
    })

    return { email: subscriber.email, result: NEWSLETTER_TOKEN_RESULT.OK }
  })

export const confirmNewsletterSubscriptionMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof confirmNewsletterSubscription>[0]["data"]) => confirmNewsletterSubscription({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.CONFIRM,
})

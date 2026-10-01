import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { getSubscriberByToken, updateSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_MUTATION_KEYS, NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

export const unsubscribeFromNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-unsubscribe", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof newsletterZodSchemas.tokenInput>) => newsletterZodSchemas.tokenInput.parse(input))
  .handler(async ({ data: { token } }): Promise<Newsletter["tokenResult"]> => {
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
  })

export const unsubscribeFromNewsletterMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof unsubscribeFromNewsletter>[0]["data"]) => unsubscribeFromNewsletter({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE,
})

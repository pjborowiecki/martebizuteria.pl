import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { NEWSLETTER_MUTATION_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { unsubscribeByToken } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.unsubscribe.server"
import { newsletterZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

export const unsubscribeFromNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-unsubscribe", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof newsletterZodSchemas.tokenInput>) => newsletterZodSchemas.tokenInput.parse(input))
  .handler(({ data: { token } }): Promise<Newsletter["tokenResult"]> => unsubscribeByToken(token))

export const unsubscribeFromNewsletterMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof unsubscribeFromNewsletter>[0]["data"]) => unsubscribeFromNewsletter({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE,
})

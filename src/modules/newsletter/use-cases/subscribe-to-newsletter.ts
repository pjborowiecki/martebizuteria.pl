import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { sendNewsletterConfirmation } from "~/src/integrations/resend/newsletter-confirmation.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import {
  getSubscriberByEmail,
  insertSubscriber,
  normalizeSubscriberEmail,
  updateSubscriberById,
} from "~/src/modules/newsletter/newsletter.accessors"
import {
  NEWSLETTER_MUTATION_KEYS,
  NEWSLETTER_OUTCOME,
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
} from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

import { scheduleBackgroundWork } from "~/src/lib/background"

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-subscribe", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof newsletterZodSchemas.subscribeInput>) => newsletterZodSchemas.subscribeInput.parse(input))
  .handler(async ({ data }): Promise<Newsletter["outcome"]> => {
    const email = normalizeSubscriberEmail(data.email)
    const locale = data.locale ?? getCurrentLocale()
    const session = await getRequestSession()
    const existing = await getSubscriberByEmail(email)

    if (existing === undefined) {
      const token = crypto.randomUUID()
      await insertSubscriber({
        email,
        locale,
        source: data.source ?? NEWSLETTER_SOURCE.LANDING,
        status: NEWSLETTER_STATUS.PENDING,
        token,
        userId: session?.user.id,
      })
      scheduleBackgroundWork(sendNewsletterConfirmation({ email, locale, token }))

      return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
    }

    if (existing.status === NEWSLETTER_STATUS.CONFIRMED) {
      return session?.user.email === email
        ? { outcome: NEWSLETTER_OUTCOME.ALREADY_CONFIRMED }
        : { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
    }

    const token = crypto.randomUUID()
    await updateSubscriberById(existing.id, {
      locale,
      status: NEWSLETTER_STATUS.PENDING,
      token,
      updatedAt: new Date(),
      userId: existing.userId ?? session?.user.id,
    })
    scheduleBackgroundWork(sendNewsletterConfirmation({ email, locale, token }))

    return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
  })

export const subscribeToNewsletterMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof subscribeToNewsletter>[0]["data"]) => subscribeToNewsletter({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.SUBSCRIBE,
})

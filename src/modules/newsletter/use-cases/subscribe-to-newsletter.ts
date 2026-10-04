import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { sendNewsletterAlreadySubscribed } from "~/src/integrations/resend/newsletter-already-subscribed.server"
import { sendNewsletterConfirmation } from "~/src/integrations/resend/newsletter-confirmation.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
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

const reportDelivery = async ({
  delivery,
  email,
  kind,
}: Readonly<{ delivery: Promise<string | undefined>; email: string; kind: string }>): Promise<Newsletter["outcome"]> => {
  const failure = await delivery

  if (failure === undefined) {
    return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
  }

  console.error(`[Newsletter] Failed to send ${kind} to ${email}: ${failure}`)
  recordEmailFailedAudit(email, { detail: `Newsletter ${kind} — ${failure}` })

  return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED }
}

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

      return reportDelivery({ delivery: sendNewsletterConfirmation({ email, locale, token }), email, kind: "confirmation" })
    }

    if (existing.status === NEWSLETTER_STATUS.CONFIRMED && session?.user.email === email) {
      return { outcome: NEWSLETTER_OUTCOME.ALREADY_CONFIRMED }
    }

    if (existing.status === NEWSLETTER_STATUS.CONFIRMED) {
      return reportDelivery({
        delivery: sendNewsletterAlreadySubscribed({ email, locale }),
        email,
        kind: "already-subscribed notice",
      })
    }

    const token = crypto.randomUUID()
    await updateSubscriberById(existing.id, {
      locale,
      status: NEWSLETTER_STATUS.PENDING,
      token,
      updatedAt: new Date(),
      userId: existing.userId ?? session?.user.id,
    })

    return reportDelivery({ delivery: sendNewsletterConfirmation({ email, locale, token }), email, kind: "confirmation" })
  })

export const subscribeToNewsletterMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof subscribeToNewsletter>[0]["data"]) => subscribeToNewsletter({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.SUBSCRIBE,
})

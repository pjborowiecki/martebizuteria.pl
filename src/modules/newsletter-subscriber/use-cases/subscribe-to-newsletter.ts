import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { sql } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { scheduleAdminNewsletterSubscribersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { PUBLIC_EMAIL_KINDS, admitPublicEmail } from "~/src/integrations/resend/resend.public-email-limits.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUDIT_EMAIL_KIND, type AuditEmailKind } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  getSubscriberByEmail,
  insertSubscriber,
  normalizeSubscriberEmail,
  updateSubscriberById,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"
import {
  NEWSLETTER_MUTATION_KEYS,
  NEWSLETTER_OUTCOME,
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
  type NewsletterSource,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { newsletterZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { sendNewsletterAlreadySubscribedEmail } from "~/src/modules/newsletter-subscriber/use-cases/send-newsletter-already-subscribed-email.server"
import { sendNewsletterConfirmationEmail } from "~/src/modules/newsletter-subscriber/use-cases/send-newsletter-confirmation-email.server"

import { resolveRequestOrigin } from "~/src/lib/request"

const reportDelivery = async ({
  delivery,
  email,
  kind,
}: Readonly<{ delivery: Promise<string | undefined>; email: string; kind: AuditEmailKind }>): Promise<Newsletter["outcome"]> => {
  const failure = await delivery

  if (failure === undefined) {
    return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
  }

  console.error(`[Newsletter] Failed to send ${kind} to ${email}: ${failure}`)
  recordEmailFailedAudit(email, { detail: failure, metadata: { emailKind: kind } })

  return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED }
}

const mailSubscriber = async ({
  email,
  existing,
  locale,
  origin,
  source,
  userId,
}: Readonly<SubscriberMailing>): Promise<Newsletter["outcome"]> => {
  if (existing === undefined) {
    const token = crypto.randomUUID()
    await insertSubscriber({ email, locale, source, status: NEWSLETTER_STATUS.PENDING, token, userId })
    scheduleAdminNewsletterSubscribersInvalidation()

    return reportDelivery({
      delivery: sendNewsletterConfirmationEmail({ email, locale, origin, token }),
      email,
      kind: AUDIT_EMAIL_KIND.NEWSLETTER_CONFIRMATION,
    })
  }

  if (existing.status === NEWSLETTER_STATUS.CONFIRMED) {
    return reportDelivery({
      delivery: sendNewsletterAlreadySubscribedEmail({ email, locale, origin }),
      email,
      kind: AUDIT_EMAIL_KIND.NEWSLETTER_ALREADY_SUBSCRIBED,
    })
  }

  const token = crypto.randomUUID()
  await updateSubscriberById(existing.id, {
    confirmedAt: sql`null`,
    locale,
    status: NEWSLETTER_STATUS.PENDING,
    token,
    unsubscribedAt: sql`null`,
    updatedAt: new Date(),
    userId: existing.userId ?? userId,
  })
  scheduleAdminNewsletterSubscribersInvalidation()

  return reportDelivery({
    delivery: sendNewsletterConfirmationEmail({ email, locale, origin, token }),
    email,
    kind: AUDIT_EMAIL_KIND.NEWSLETTER_CONFIRMATION,
  })
}

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("newsletter-subscribe", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof newsletterZodSchemas.subscribeInput>) => newsletterZodSchemas.subscribeInput.parse(input))
  .handler(async ({ data }): Promise<Newsletter["outcome"]> => {
    const origin = resolveRequestOrigin(getRequest())
    const email = normalizeSubscriberEmail(data.email)
    const session = await getRequestSession()
    const existing = await getSubscriberByEmail(email)

    if (existing?.status === NEWSLETTER_STATUS.CONFIRMED && session?.user.email === email) {
      return { outcome: NEWSLETTER_OUTCOME.ALREADY_CONFIRMED }
    }

    if (!(await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.NEWSLETTER, to: email }))) {
      return { outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT }
    }

    return mailSubscriber({
      email,
      existing,
      locale: data.locale ?? getCurrentLocale(),
      origin,
      source: data.source ?? NEWSLETTER_SOURCE.LANDING,
      userId: session?.user.id,
    })
  })

export const subscribeToNewsletterMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof subscribeToNewsletter>[0]["data"]) => subscribeToNewsletter({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.SUBSCRIBE,
})

interface SubscriberMailing {
  readonly email: string
  readonly existing: Newsletter["select"] | undefined
  readonly locale: SupportedLocale
  readonly origin: string
  readonly source: NewsletterSource
  readonly userId: string | undefined
}

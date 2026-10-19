import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray, or, sql } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import {
  scheduleAdminAuditLogInvalidation,
  scheduleAdminNewsletterSubscribersInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_EMAIL_KIND, AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { recordNewsletterSubscriberErasedAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { NEWSLETTER_ERROR_CODES, NEWSLETTER_MUTATION_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { keyedByFormerAddressOf } from "~/src/modules/user-email-history/user-email-history.accessors"

const SUBSCRIBER_EMAIL_KINDS = [
  AUDIT_EMAIL_KIND.NEWSLETTER_ALREADY_SUBSCRIBED,
  AUDIT_EMAIL_KIND.NEWSLETTER_CONFIRMATION,
  AUDIT_EMAIL_KIND.NEWSLETTER_SUBSCRIPTION,
]

const SUBSCRIPTION_CHANGE_ACTIONS = [AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_CONFIRMED, AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_UNSUBSCRIBED]

const newsletterAuditEntriesOf = (subscriberId: string) => {
  const subscriberEmail = db
    .select({ email: newsletterSubscriber.email })
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.id, subscriberId))
  const emailKind = sql`json_extract(${auditLog.metadata}, '$.emailKind')`
  const subscriptionChange = inArray(auditLog.action, SUBSCRIPTION_CHANGE_ACTIONS)

  const subscriberAccount = sql`(${db.select({ userId: newsletterSubscriber.userId }).from(newsletterSubscriber).where(eq(newsletterSubscriber.id, subscriberId))})`

  return and(
    or(
      inArray(auditLog.resourceId, subscriberEmail),
      keyedByFormerAddressOf(subscriberAccount, { address: auditLog.resourceId, at: auditLog.createdAt }),
    ),
    inArray(auditLog.action, [...SUBSCRIPTION_CHANGE_ACTIONS, AUDIT_LOG_ACTION.EMAIL_FAILED]),
    or(subscriptionChange, inArray(emailKind, SUBSCRIBER_EMAIL_KINDS)),
  )
}

export const eraseNewsletterSubscriber = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["delete"] })])
  .validator((input: zod.input<typeof newsletterZodSchemas.subscriberIdInput>) => newsletterZodSchemas.subscriberIdInput.parse(input))
  .handler(async ({ data: { id } }): Promise<void> => {
    const [, [erased]] = await db.batch([
      db.delete(auditLog).where(newsletterAuditEntriesOf(id)),
      db.delete(newsletterSubscriber).where(eq(newsletterSubscriber.id, id)).returning({ email: newsletterSubscriber.email }),
    ])
    if (erased === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, NEWSLETTER_ERROR_CODES.SUBSCRIBER_NOT_FOUND)
    }

    recordNewsletterSubscriberErasedAudit(erased.email)
    scheduleAdminNewsletterSubscribersInvalidation()
    scheduleAdminAuditLogInvalidation()
  })

export const eraseNewsletterSubscriberMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof eraseNewsletterSubscriber>[0]["data"]) => eraseNewsletterSubscriber({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.ERASE_SUBSCRIBER,
})

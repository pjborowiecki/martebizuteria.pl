import { eq, inArray, or } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import {
  scheduleAdminAuditLogInvalidation,
  scheduleAdminNewsletterSubscribersInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { deleteStripeCustomer } from "~/src/integrations/stripe/stripe.customer.server"

import { recordCustomerDeletionFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { normalizeSubscriberEmail } from "~/src/modules/newsletter/newsletter.accessors"
import { newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"
import { prepareKeepingDeletedAccountOrdersFromClaims } from "~/src/modules/order/order.claim.server"
import { keyedByFormerAddressOf } from "~/src/modules/user-email-history/user-email-history.accessors"

export const eraseAccountData = async ({ email, id }: ErasedAccount): Promise<boolean> => {
  try {
    await deleteStripeCustomer(id)
  } catch (error) {
    console.error(`[Account deletion] Kept user ${id} because its Stripe customer could not be deleted:`, error)
    recordCustomerDeletionFailedAudit(email, { detail: String(error), resourceId: id })

    return false
  }

  const subscriberEmail = normalizeSubscriberEmail(email)
  const accountSubscription = or(eq(newsletterSubscriber.userId, id), eq(newsletterSubscriber.email, subscriberEmail))
  const accountEntry = or(
    inArray(auditLog.resourceId, [id, email]),
    keyedByFormerAddressOf(id, { address: auditLog.resourceId, at: auditLog.createdAt }),
  )

  await db.batch([
    db.delete(auditLog).where(accountEntry),
    db.delete(newsletterSubscriber).where(accountSubscription),
    prepareKeepingDeletedAccountOrdersFromClaims({ email, userId: id }),
  ])
  scheduleAdminAuditLogInvalidation()
  scheduleAdminNewsletterSubscribersInvalidation()

  return true
}

interface ErasedAccount {
  readonly email: string
  readonly id: string
}

import { eq, inArray, or } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleAdminAuditLogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { deleteStripeCustomer } from "~/src/integrations/stripe/stripe.customer.server"

import { recordCustomerDeletionFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { normalizeSubscriberEmail } from "~/src/modules/newsletter/newsletter.accessors"
import { newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"

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

  await db.batch([
    db.delete(auditLog).where(inArray(auditLog.resourceId, [id, email])),
    db.delete(newsletterSubscriber).where(accountSubscription),
  ])
  scheduleAdminAuditLogInvalidation()

  return true
}

interface ErasedAccount {
  readonly email: string
  readonly id: string
}

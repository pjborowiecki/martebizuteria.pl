import { sql } from "drizzle-orm"

import { scheduleAdminNewsletterSubscribersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import {
  getSubscriberByEmail,
  mergeSubscribers,
  normalizeSubscriberEmail,
  updateSubscriberById,
} from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

const takenOverStatus = (next: Newsletter["select"], previous: Newsletter["select"]) =>
  next.status === NEWSLETTER_STATUS.PENDING && previous.status === NEWSLETTER_STATUS.CONFIRMED
    ? { confirmedAt: previous.confirmedAt, status: previous.status, unsubscribedAt: sql`NULL` }
    : {}

export const followAccountAddressChange = async ({ from, to, userId }: Readonly<AccountAddressChange>): Promise<void> => {
  const [previous, next] = await Promise.all([getSubscriberByEmail(from), getSubscriberByEmail(to)])
  if (previous === undefined) {
    return
  }

  const updatedAt = new Date()
  await (next === undefined
    ? updateSubscriberById(previous.id, { email: normalizeSubscriberEmail(to), token: crypto.randomUUID(), updatedAt, userId })
    : mergeSubscribers({
        kept: { id: next.id, values: { ...takenOverStatus(next, previous), updatedAt, userId } },
        removedId: previous.id,
      }))
  scheduleAdminNewsletterSubscribersInvalidation()
}

interface AccountAddressChange {
  readonly from: string
  readonly to: string
  readonly userId: string
}

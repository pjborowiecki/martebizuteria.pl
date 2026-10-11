import { and, eq, inArray, lt, or } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"

export const deleteLapsedNewsletterSubscribers = async ({
  limit,
  unconfirmedBefore,
  unsubscribedBefore,
}: DeleteLapsedNewsletterSubscribersInput): Promise<number> => {
  const unconfirmed = and(eq(newsletterSubscriber.status, NEWSLETTER_STATUS.PENDING), lt(newsletterSubscriber.updatedAt, unconfirmedBefore))
  const unsubscribed = and(
    eq(newsletterSubscriber.status, NEWSLETTER_STATUS.UNSUBSCRIBED),
    lt(newsletterSubscriber.unsubscribedAt, unsubscribedBefore),
  )
  const lapsed = db.select({ id: newsletterSubscriber.id }).from(newsletterSubscriber).where(or(unconfirmed, unsubscribed)).limit(limit)
  const deleted = await db
    .delete(newsletterSubscriber)
    .where(inArray(newsletterSubscriber.id, lapsed))
    .returning({ id: newsletterSubscriber.id })

  return deleted.length
}

export interface DeleteLapsedNewsletterSubscribersInput {
  readonly limit: number
  readonly unconfirmedBefore: Date
  readonly unsubscribedBefore: Date
}

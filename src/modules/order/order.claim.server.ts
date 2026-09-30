import { and, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { order } from "~/src/modules/order/order.schema"

/**
 * Guest checkout leaves orders with no owner. Once someone proves control of
 * that address by verifying it on an account, those orders are theirs, so the
 * account history stops pretending they never happened.
 *
 * Matching on a verified address only is the whole safeguard: an unverified
 * sign-up must never be able to claim a stranger's purchase history.
 */
export const claimGuestOrdersForUser = async ({ email, userId }: ClaimGuestOrdersInput): Promise<number> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === "") {
    return NO_ORDERS
  }

  const claimed = await db
    .update(order)
    .set({ updatedAt: new Date(), userId })
    .where(and(isNull(order.userId), eq(sql`lower(${order.email})`, normalizedEmail)))
    .returning({ id: order.id })

  if (claimed.length > NO_ORDERS) {
    console.info(`Linked ${String(claimed.length)} guest order(s) to user ${userId}.`)
  }

  return claimed.length
}

const NO_ORDERS = 0

interface ClaimGuestOrdersInput {
  readonly email: string
  readonly userId: string
}

import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCustomerOrdersClaimedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { discountRedemption } from "~/src/modules/discount/discount.schema"
import { order } from "~/src/modules/order/order.schema"

export const claimGuestOrdersForUser = async ({ email, userId }: ClaimGuestOrdersInput): Promise<number> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === "") {
    return NO_ORDERS
  }

  const claimedAt = new Date()
  const guestOrderWithEmail = and(isNull(order.userId), eq(sql`lower(${order.email})`, normalizedEmail))
  const ordersOfUser = db.select({ id: order.id }).from(order).where(eq(order.userId, userId))
  const redemptionOfUserOrderFiledElsewhere = and(
    inArray(discountRedemption.orderId, ordersOfUser),
    sql`${discountRedemption.userId} is not ${userId}`,
  )
  const [claimed] = await db.batch([
    db.update(order).set({ updatedAt: claimedAt, userId }).where(guestOrderWithEmail).returning({ id: order.id }),
    db.update(discountRedemption).set({ updatedAt: claimedAt, userId }).where(redemptionOfUserOrderFiledElsewhere),
  ])

  if (claimed.length > NO_ORDERS) {
    console.info(`Linked ${String(claimed.length)} guest order(s) to user ${userId}.`)
    recordCustomerOrdersClaimedAudit(normalizedEmail, {
      metadata: { orderCount: claimed.length, orderIds: claimed.map(({ id }) => id) },
      resourceId: userId,
    })
  }

  return claimed.length
}

const NO_ORDERS = 0

interface ClaimGuestOrdersInput {
  readonly email: string
  readonly userId: string
}

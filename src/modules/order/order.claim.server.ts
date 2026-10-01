import { and, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { order } from "~/src/modules/order/order.schema"

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

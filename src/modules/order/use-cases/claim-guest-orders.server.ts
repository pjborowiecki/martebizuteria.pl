import { and, eq, inArray, isNull, not, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCustomerOrdersClaimedAudit } from "~/src/modules/audit-log/use-cases/record-customer-audit.server"
import { discountRedemption } from "~/src/modules/discount/discount.schema"
import { order } from "~/src/modules/order/order.schema"
import { accountHeldAddressAt, anotherAccountHeldAddressAt } from "~/src/modules/user-email-history/user-email-history.accessors"

export const claimGuestOrdersForUser = async ({ email, userId }: ClaimGuestOrdersInput): Promise<number> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === "") {
    return NO_ORDERS
  }

  const claimedAt = new Date()
  const placedWith = { address: sql`lower(${order.email})`, at: order.createdAt }
  const placedWhileAccountHeldAddress = accountHeldAddressAt(userId, placedWith)
  const placedWithAddressNoOtherAccountHeld = and(
    eq(placedWith.address, normalizedEmail),
    not(anotherAccountHeldAddressAt(userId, placedWith)),
  )
  const guestOrderOfAccount = and(
    isNull(order.userId),
    not(keptFromClaims),
    or(placedWhileAccountHeldAddress, placedWithAddressNoOtherAccountHeld),
  )
  const ordersOfUser = db.select({ id: order.id }).from(order).where(eq(order.userId, userId))
  const redemptionOfUserOrderFiledElsewhere = and(
    inArray(discountRedemption.orderId, ordersOfUser),
    sql`${discountRedemption.userId} is not ${userId}`,
  )
  const [claimed] = await db.batch([
    db.update(order).set({ updatedAt: claimedAt, userId }).where(guestOrderOfAccount).returning({ id: order.id }),
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

export const prepareKeepingDeletedAccountOrdersFromClaims = ({ email, userId }: ClaimGuestOrdersInput) =>
  db
    .update(order)
    .set({ metadata: sql`json_set(${metadataObject}, ${KEPT_FROM_CLAIMS_PATH}, json('true'))` })
    .where(and(eq(order.userId, userId), sql`lower(${order.email}) is not ${email.trim().toLowerCase()}`))

const NO_ORDERS = 0

const KEPT_FROM_CLAIMS_PATH = "$.keptFromClaims"

const metadataObject = sql`case when json_valid(${order.metadata}) then ${order.metadata} else '{}' end`

const keptFromClaims = sql`coalesce(json_extract(${metadataObject}, ${KEPT_FROM_CLAIMS_PATH}), 0) = 1`

interface ClaimGuestOrdersInput {
  readonly email: string
  readonly userId: string
}

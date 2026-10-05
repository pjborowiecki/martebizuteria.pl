import { eq, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { discount, discountClaim, discountRedemption } from "~/src/modules/discount/discount.schema"

export const prepareDiscountRedemption = ({
  checkoutId,
  email,
  orderId,
  redeemed,
  userId,
}: DiscountRedemptionInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] => {
  const releaseCheckoutClaims = db.delete(discountClaim).where(eq(discountClaim.checkoutId, checkoutId))
  if (redeemed === undefined) {
    return [releaseCheckoutClaims]
  }

  const redeemedAt = new Date()
  const redemptionColumns = {
    amount: sql<number>`${redeemed.amountMinorUnits}`.as("amount"),
    discountId: discount.id,
    email: sql<string>`${email}`.as("email"),
    id: sql<string>`${crypto.randomUUID()}`.as("id"),
    orderId: sql<string>`${orderId}`.as("order_id"),
    userId: sql<string | null>`${userId}`.as("user_id"),
  }
  const redemptionRowInTableOrder = Object.assign(redemptionColumns, {
    createdAt: sql<Date>`${sql.param(redeemedAt, discountRedemption.createdAt)}`.as("created_at"),
    updatedAt: sql<Date>`${sql.param(redeemedAt, discountRedemption.updatedAt)}`.as("updated_at"),
  })

  return [
    releaseCheckoutClaims,
    db.insert(discountRedemption).select(db.select(redemptionRowInTableOrder).from(discount).where(eq(discount.id, redeemed.discountId))),
    db
      .update(discount)
      .set({ updatedAt: redeemedAt, usageCount: sql`${discount.usageCount} + 1` })
      .where(eq(discount.id, redeemed.discountId)),
  ]
}

interface DiscountRedemptionInput {
  readonly checkoutId: string
  readonly email: string
  readonly orderId: string
  readonly redeemed: RedeemedDiscount | undefined
  readonly userId: string | null
}

interface RedeemedDiscount {
  readonly amountMinorUnits: number
  readonly discountId: string
}

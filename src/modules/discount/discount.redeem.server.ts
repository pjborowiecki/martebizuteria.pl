import { eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { discount, discountRedemption } from "~/src/modules/discount/discount.schema"

/**
 * Spending the code is deliberately separate from creating the order and is
 * keyed by order id, so a replayed Stripe webhook cannot bump the counter
 * twice. A failure here must not fail the order: the customer has paid, and an
 * uncounted redemption is a smaller problem than a lost order.
 */
export const recordDiscountRedemption = async ({
  amount,
  discountId,
  email,
  orderId,
  userId,
}: RecordDiscountRedemptionInput): Promise<boolean> => {
  try {
    const inserted = await db
      .insert(discountRedemption)
      .values({ amount, discountId, email, orderId, userId })
      .onConflictDoNothing({ target: discountRedemption.orderId })
      .returning({ id: discountRedemption.id })

    if (inserted.length === NO_ROWS) {
      return false
    }

    await db
      .update(discount)
      .set({ updatedAt: new Date(), usageCount: sql`${discount.usageCount} + 1` })
      .where(eq(discount.id, discountId))

    return true
  } catch (error) {
    console.error(`Failed to record redemption of discount ${discountId} for order ${orderId}:`, error)

    return false
  }
}

const NO_ROWS = 0

interface RecordDiscountRedemptionInput {
  readonly amount: number
  readonly discountId: string
  readonly email: string
  readonly orderId: string
  readonly userId: string | null
}

import { and, eq, exists, inArray, isNull, ne } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type CheckoutFulfillmentLine } from "~/src/modules/checkout/checkout-metadata.zod"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { type ReleaseLine } from "~/src/modules/checkout/checkout.utils"
import { discountClaim } from "~/src/modules/discount/discount.schema"
import { inventoryReleaseValues } from "~/src/modules/inventory/inventory.accessors"
import { quantitiesBeyond } from "~/src/modules/inventory/inventory.availability.utils"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { payment } from "~/src/modules/payment/payment.schema"

export const supersedeCheckoutSession = async ({
  amount,
  discountId,
  heldLines,
  lines,
  newTransactionId,
  oldTransactionId,
  reservedLines,
  userId,
}: SupersedeCheckoutSessionInput): Promise<boolean> => {
  const pendingCheckout = db
    .select({ id: checkout.id })
    .from(checkout)
    .where(and(eq(checkout.id, payment.checkoutId), eq(checkout.status, "pending")))
  const pendingOldPayment = and(eq(payment.transactionId, oldTransactionId), eq(payment.status, "pending"), exists(pendingCheckout))
  const supersedingPayment = db.select({ checkoutId: payment.checkoutId }).from(payment).where(eq(payment.transactionId, newTransactionId))
  const claimsTheReplacementDoesNotUse = and(
    inArray(discountClaim.checkoutId, supersedingPayment),
    discountId === undefined ? undefined : ne(discountClaim.discountId, discountId),
  )
  const supersedingPaymentOfCheckout = db
    .select({ id: payment.id })
    .from(payment)
    .where(and(eq(payment.checkoutId, checkout.id), eq(payment.transactionId, newTransactionId)))
  const claimGuestCheckout =
    userId === undefined
      ? []
      : [
          db
            .update(checkout)
            .set({ userId })
            .where(and(isNull(checkout.userId), eq(checkout.status, "pending"), exists(supersedingPaymentOfCheckout))),
        ]

  const [movedPayments] = await db.batch([
    db
      .update(payment)
      .set({ amount, lines, reservedLines, transactionId: newTransactionId })
      .where(pendingOldPayment)
      .returning({ id: payment.id }),
    ...quantitiesBeyond(heldLines, reservedLines).map((line) =>
      db
        .update(inventory)
        .set(inventoryReleaseValues(line.qty))
        .where(and(eq(inventory.variantId, line.variantId), exists(supersedingPayment))),
    ),
    db.delete(discountClaim).where(claimsTheReplacementDoesNotUse),
    ...claimGuestCheckout,
  ])

  return movedPayments.length > 0
}

export interface SupersedeCheckoutSessionInput {
  readonly amount: number
  readonly discountId: string | undefined
  readonly heldLines: readonly ReleaseLine[]
  readonly lines: readonly CheckoutFulfillmentLine[]
  readonly newTransactionId: string
  readonly oldTransactionId: string
  readonly reservedLines: readonly ReleaseLine[]
  readonly userId: string | undefined
}

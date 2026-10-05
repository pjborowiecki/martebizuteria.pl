import { and, eq, exists, isNull } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { type ReleaseLine } from "~/src/modules/checkout/checkout.utils"
import { inventoryReleaseValues } from "~/src/modules/inventory/inventory.accessors"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { payment } from "~/src/modules/payment/payment.schema"

export const supersedeCheckoutSession = async ({
  amount,
  heldLines,
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
  const supersedingPayment = db.select({ id: payment.id }).from(payment).where(eq(payment.transactionId, newTransactionId))
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
      .set({ amount, reservedLines, transactionId: newTransactionId })
      .where(pendingOldPayment)
      .returning({ id: payment.id }),
    ...heldLines.map((line) =>
      db
        .update(inventory)
        .set(inventoryReleaseValues(line.qty))
        .where(and(eq(inventory.variantId, line.variantId), exists(supersedingPayment))),
    ),
    ...claimGuestCheckout,
  ])

  return movedPayments.length > 0
}

export interface SupersedeCheckoutSessionInput {
  readonly amount: number
  readonly heldLines: readonly ReleaseLine[]
  readonly newTransactionId: string
  readonly oldTransactionId: string
  readonly reservedLines: readonly ReleaseLine[]
  readonly userId: string | undefined
}

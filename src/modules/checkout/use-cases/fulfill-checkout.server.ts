import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { recordDiscountRedeemedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getCheckoutForFulfillment } from "~/src/modules/checkout/checkout.accessors"
import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { recordDiscountRedemption } from "~/src/modules/discount/discount.redeem.server"
import { calculateDiscountAmount } from "~/src/modules/discount/discount.utils"
import { allocateOrderNumber } from "~/src/modules/order/order.number.server"
import { type OrderTotals, computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"

import { scheduleBackgroundWork } from "~/src/lib/background"

const NO_AMOUNT = 0

/**
 * Stripe's amount_total is the source of truth for what the customer paid, but
 * it cannot say which part was shipping, discount or tax. Those come from the
 * checkout the session was built from; a mismatch means the session drifted
 * from the checkout and is worth surfacing rather than silently absorbing.
 */
const reconcileTotals = (totals: OrderTotals, paidAmount: number, transactionId: string): void => {
  if (totals.total !== paidAmount) {
    console.error(
      `Checkout ${transactionId}: computed total ${String(totals.total)} does not match Stripe amount_total ${String(paidAmount)}.`,
    )
  }
}

export const fulfillCheckout = async (input: FulfillCheckoutFromSessionInput): Promise<string | undefined> => {
  const context = await findPendingCheckoutByTransaction(input.transactionId)
  if (context === undefined) {
    return undefined
  }

  const checkoutRow = await getCheckoutForFulfillment(context.checkoutId)
  const itemsSubtotal = sumOrderLineSubtotal(input.lines)
  const shippingTotal = checkoutRow?.deliveryMethod?.price ?? NO_AMOUNT
  const discount =
    checkoutRow?.discount === null || checkoutRow?.discount === undefined
      ? undefined
      : {
          amountMinorUnits: calculateDiscountAmount({ itemsSubtotal, row: checkoutRow.discount, shippingTotal }),
          discountId: checkoutRow.discount.id,
        }
  const totals = computeOrderTotals({
    discountTotal: discount?.amountMinorUnits,
    itemsSubtotal,
    shippingTotal,
  })
  reconcileTotals(totals, input.paidAmount, input.transactionId)

  const orderNumber = await allocateOrderNumber()
  const { orderId, statements } = prepareFulfillCheckoutBatch(
    context,
    {
      currency: input.currency,
      lines: input.lines,
      locale: input.locale,
      orderNumber,
      totals,
      transactionId: input.transactionId,
    },
    {
      billingCompanyName: checkoutRow?.billingCompanyName,
      billingNip: checkoutRow?.billingNip,
      customerNote: checkoutRow?.customerNote,
      deliveryMethodId: checkoutRow?.deliveryMethodId,
      discountId: checkoutRow?.discountId,
      lockerId: checkoutRow?.lockerId,
    },
  )
  await runDrizzleBatch(statements)

  if (discount !== undefined) {
    scheduleBackgroundWork(
      recordDiscountRedemption({
        amount: discount.amountMinorUnits,
        discountId: discount.discountId,
        email: context.email,
        orderId,
        userId: context.userId,
      }).then((recorded) => {
        if (recorded) {
          recordDiscountRedeemedAudit(orderId, { detail: String(discount.amountMinorUnits) })
        }
      }),
    )
  }

  return orderId
}

export interface FulfillCheckoutFromSessionInput extends Pick<FulfillCheckoutInput, "currency" | "lines" | "locale" | "transactionId"> {
  readonly paidAmount: number
}

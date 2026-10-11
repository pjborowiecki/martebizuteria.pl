import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { recordDiscountRedeemedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getCheckoutForFulfillment } from "~/src/modules/checkout/checkout.accessors"
import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { prepareDiscountRedemption } from "~/src/modules/discount/discount.redeem.server"
import { calculateDiscountAmount } from "~/src/modules/discount/discount.utils"
import { type OrderTotals, computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"

const NO_AMOUNT = 0

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

  const { orderId, statements } = prepareFulfillCheckoutBatch(
    context,
    {
      currency: input.currency,
      lines: input.lines,
      locale: input.locale,
      totals,
      transactionId: input.transactionId,
    },
    {
      billingAddress: checkoutRow?.billingAddress,
      billingCompanyName: checkoutRow?.billingCompanyName,
      billingNip: checkoutRow?.billingNip,
      customerNote: checkoutRow?.customerNote,
      deliveryMethodId: checkoutRow?.deliveryMethodId,
      discountId: checkoutRow?.discountId,
      lockerId: checkoutRow?.lockerId,
      lockerUnconfirmed: checkoutRow?.lockerUnconfirmed,
      shippingAddress: checkoutRow?.shippingAddress,
    },
  )
  await runDrizzleBatch([
    ...statements,
    ...prepareDiscountRedemption({
      checkoutId: context.checkoutId,
      email: context.email,
      orderId,
      redeemed: discount,
      userId: context.userId,
    }),
  ])

  if (discount !== undefined) {
    recordDiscountRedeemedAudit(orderId, { detail: String(discount.amountMinorUnits) })
  }

  return orderId
}

export interface FulfillCheckoutFromSessionInput extends Pick<FulfillCheckoutInput, "currency" | "lines" | "locale" | "transactionId"> {
  readonly paidAmount: number
}

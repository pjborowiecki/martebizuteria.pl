import { type DrizzleBatchStatement, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { recordDiscountRedeemedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getCheckoutForFulfillment } from "~/src/modules/checkout/checkout.accessors"
import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { prepareDiscountRedemption } from "~/src/modules/discount/discount.redeem.server"
import { calculateDiscountAmount } from "~/src/modules/discount/discount.utils"
import { getOrderByCheckoutId } from "~/src/modules/order/order.accessors"
import { type OrderTotals, computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"

const NO_AMOUNT = 0

const reconcileTotals = (totals: OrderTotals, paidAmount: number, transactionId: string): void => {
  if (totals.total !== paidAmount) {
    console.error(
      `Checkout ${transactionId}: computed total ${String(totals.total)} does not match Stripe amount_total ${String(paidAmount)}.`,
    )
  }
}

const findPlacedOrderId = async (checkoutId: string): Promise<string | undefined> => {
  try {
    const placedOrder = await getOrderByCheckoutId(checkoutId)

    return placedOrder?.id
  } catch (lookupError) {
    console.error(`Could not look up the order of checkout ${checkoutId}:`, lookupError)

    return undefined
  }
}

const commitFulfillment = async (
  statements: readonly DrizzleBatchStatement[],
  { checkoutId, orderId, transactionId }: FulfillmentCommit,
): Promise<boolean> => {
  try {
    await runDrizzleBatch(statements)

    return true
  } catch (error) {
    const placedOrderId = await findPlacedOrderId(checkoutId)
    if (placedOrderId === orderId) {
      console.warn(`Checkout ${checkoutId} became Order ${orderId} although its batch reported an error:`, error)

      return true
    }

    if (placedOrderId === undefined) {
      throw error
    }

    console.info(`Checkout ${checkoutId} already became Order ${placedOrderId} through another delivery of ${transactionId}.`)

    return false
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
      lockerPoint: checkoutRow?.lockerPoint,
      lockerUnconfirmed: checkoutRow?.lockerUnconfirmed,
      shippingAddress: checkoutRow?.shippingAddress,
    },
  )
  const committed = await commitFulfillment(
    [
      ...statements,
      ...prepareDiscountRedemption({
        checkoutId: context.checkoutId,
        email: context.email,
        orderId,
        redeemed: discount,
        userId: context.userId,
      }),
    ],
    { checkoutId: context.checkoutId, orderId, transactionId: input.transactionId },
  )
  if (!committed) {
    return undefined
  }

  if (discount !== undefined) {
    recordDiscountRedeemedAudit(orderId, { detail: String(discount.amountMinorUnits) })
  }

  return orderId
}

interface FulfillmentCommit {
  readonly checkoutId: string
  readonly orderId: string
  readonly transactionId: string
}

export interface FulfillCheckoutFromSessionInput extends Pick<FulfillCheckoutInput, "currency" | "lines" | "locale" | "transactionId"> {
  readonly paidAmount: number
}

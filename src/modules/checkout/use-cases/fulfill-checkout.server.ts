import { type DrizzleBatchStatement, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { recordDiscountRedeemedAudit, recordOrderPlacedAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { getCheckoutForFulfillment } from "~/src/modules/checkout/checkout.accessors"
import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { prepareDiscountRedemption } from "~/src/modules/discount/discount.redeem.server"
import { calculateDiscountAmount } from "~/src/modules/discount/discount.utils"
import { getOrderByCheckoutId } from "~/src/modules/order/order.accessors"
import { type OrderTotals } from "~/src/modules/order/order.types"
import { computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.utils"

const NO_AMOUNT = 0

const reconcileTotals = (totals: OrderTotals, paidAmount: number, transactionId: string): void => {
  if (totals.total !== paidAmount) {
    console.error(
      `Checkout ${transactionId}: computed total ${String(totals.total)} does not match Stripe amount_total ${String(paidAmount)}.`,
    )
  }
}

const resolveDiscountTotal = (
  pricedDiscountTotal: number | undefined,
  discountRow: DiscountAmountRow | null | undefined,
  { itemsSubtotal, shippingTotal }: Omit<DiscountAmountInput, "row">,
): number | undefined => {
  if (pricedDiscountTotal !== undefined) {
    return pricedDiscountTotal
  }

  return discountRow === null || discountRow === undefined
    ? undefined
    : calculateDiscountAmount({ itemsSubtotal, row: discountRow, shippingTotal })
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
  const shippingTotal = input.shippingTotal ?? checkoutRow?.deliveryMethod?.price ?? NO_AMOUNT
  const totals = computeOrderTotals({
    discountTotal: resolveDiscountTotal(input.discountTotal, checkoutRow?.discount, { itemsSubtotal, shippingTotal }),
    itemsSubtotal,
    shippingTotal,
  })
  reconcileTotals(totals, input.paidAmount, input.transactionId)
  const discountId = checkoutRow?.discountId
  const discount =
    discountId === null || discountId === undefined || totals.discountTotal === NO_AMOUNT
      ? undefined
      : { amountMinorUnits: totals.discountTotal, discountId }

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
      }),
    ],
    { checkoutId: context.checkoutId, orderId, transactionId: input.transactionId },
  )
  if (!committed) {
    return undefined
  }

  recordOrderPlacedAudit(orderId, { detail: context.email, resourceId: orderId })
  if (discount !== undefined) {
    recordDiscountRedeemedAudit(orderId, { detail: String(discount.amountMinorUnits) })
  }

  return orderId
}

type DiscountAmountInput = Parameters<typeof calculateDiscountAmount>[0]

type DiscountAmountRow = DiscountAmountInput["row"]

interface FulfillmentCommit {
  readonly checkoutId: string
  readonly orderId: string
  readonly transactionId: string
}

export interface FulfillCheckoutFromSessionInput extends Pick<FulfillCheckoutInput, "currency" | "lines" | "locale" | "transactionId"> {
  readonly discountTotal?: number | undefined
  readonly paidAmount: number
  readonly shippingTotal?: number | undefined
}

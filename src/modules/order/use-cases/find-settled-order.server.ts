import { getOrderByCheckoutId } from "~/src/modules/order/order.accessors"
import { type Order } from "~/src/modules/order/order.types"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"

export const resolveSettledOrder = (
  paymentRow:
    | {
        checkoutId: string
        id: string
        status: string
      }
    | undefined,
  orderRow:
    | {
        id: string
      }
    | undefined,
  transactionId: string,
): Order["settled"] | undefined => {
  if (paymentRow === undefined) {
    console.info(`No payment for transaction ${transactionId}; nothing to update.`)

    return undefined
  }

  return {
    checkoutId: paymentRow.checkoutId,
    orderId: orderRow?.id,
    paymentId: paymentRow.id,
    paymentStatus: paymentRow.status,
  }
}

export const findSettledOrder = async (transactionId: string) => {
  const paymentRow = await getPaymentByTransactionId(transactionId)
  const orderRow = paymentRow === undefined ? undefined : await getOrderByCheckoutId(paymentRow.checkoutId)

  return resolveSettledOrder(paymentRow, orderRow, transactionId)
}

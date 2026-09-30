import { getOrderByCheckoutId } from "~/src/modules/order/order.accessors"
import { resolveSettledOrder } from "~/src/modules/order/order.utils"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"

export const findSettledOrder = async (transactionId: string) => {
  const paymentRow = await getPaymentByTransactionId(transactionId)
  const orderRow = paymentRow === undefined ? undefined : await getOrderByCheckoutId(paymentRow.checkoutId)

  return resolveSettledOrder(paymentRow, orderRow, transactionId)
}

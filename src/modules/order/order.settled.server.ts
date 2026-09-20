import { getOrderByCheckoutId, getPaymentByTransactionId } from "~/src/modules/order/order.accessors"
import { resolveSettledOrder } from "~/src/modules/order/order.utils"
export const findSettledOrder = async (transactionId: string) => {
  const paymentRow = await getPaymentByTransactionId(transactionId)
  const orderRow = paymentRow === undefined ? undefined : await getOrderByCheckoutId(paymentRow.checkoutId)
  return resolveSettledOrder(paymentRow, orderRow, transactionId)
}

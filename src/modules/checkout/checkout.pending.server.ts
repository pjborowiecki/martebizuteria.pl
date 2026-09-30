import { getCheckoutById } from "~/src/modules/checkout/checkout.accessors"
import { resolvePendingCheckout } from "~/src/modules/checkout/checkout.utils"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"

export const findPendingCheckoutByTransaction = async (transactionId: string) => {
  const paymentRow = await getPaymentByTransactionId(transactionId)
  const checkoutRow = paymentRow === undefined ? undefined : await getCheckoutById(paymentRow.checkoutId)

  return resolvePendingCheckout(paymentRow, checkoutRow, transactionId)
}

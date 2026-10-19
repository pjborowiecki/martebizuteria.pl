import { getOrderMetadata, updateOrderMetadata } from "~/src/modules/order/order.accessors"
import { clearDisputeMetadata } from "~/src/modules/order/order.utils"
import { findSettledOrder } from "~/src/modules/order/use-cases/find-settled-order.server"

export const clearOrderDispute = async (transactionId: string): Promise<void> => {
  const settled = await findSettledOrder(transactionId)
  if (settled?.orderId === undefined) {
    return
  }

  const current = await getOrderMetadata(settled.orderId)
  await updateOrderMetadata(settled.orderId, clearDisputeMetadata(current?.metadata))
}

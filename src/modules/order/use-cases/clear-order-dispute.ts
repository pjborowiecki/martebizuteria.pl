import { getOrderMetadata, updateOrderMetadata } from "~/src/modules/order/order.accessors"
import { clearDisputeMetadata } from "~/src/modules/order/order.display.utils"
import { findSettledOrder } from "~/src/modules/order/order.settled.server"

export const clearOrderDispute = async (transactionId: string): Promise<void> => {
  const settled = await findSettledOrder(transactionId)
  if (settled?.orderId === undefined) {
    return
  }

  const current = await getOrderMetadata(settled.orderId)
  await updateOrderMetadata(settled.orderId, clearDisputeMetadata(current?.metadata))
}

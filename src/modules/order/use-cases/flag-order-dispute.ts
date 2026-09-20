import { getOrderMetadata, updateOrderMetadata } from "~/src/modules/order/order.accessors"
import { type DisputeMetadata, mergeDisputeMetadata } from "~/src/modules/order/order.display.utils"
import { findSettledOrder } from "~/src/modules/order/order.settled.server"
export const flagOrderDispute = async (transactionId: string, dispute: DisputeMetadata): Promise<void> => {
  const settled = await findSettledOrder(transactionId)
  if (settled?.orderId === undefined) {
    return
  }
  const current = await getOrderMetadata(settled.orderId)
  await updateOrderMetadata(settled.orderId, mergeDisputeMetadata(current?.metadata, dispute))
}

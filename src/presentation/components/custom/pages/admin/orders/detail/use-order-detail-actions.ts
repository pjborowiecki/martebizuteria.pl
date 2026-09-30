import { useCallback, useState } from "react"

import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderDelivered,
  canMarkAdminOrderShipped,
  canPrintAdminOrderInvoice,
  canRefundAdminOrder,
} from "~/src/modules/order/order.admin-actions.utils"
import { type Order } from "~/src/modules/order/order.types"

import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderDelivered,
  useMarkOrderShipped,
  useRefundOrder,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

export const useOrderDetailActions = (order: Order["adminOrderDetail"]): UseOrderDetailActionsResult => {
  const fulfillOrder = useFulfillOrder()
  const markOrderShipped = useMarkOrderShipped()
  const markOrderDelivered = useMarkOrderDelivered()
  const cancelOrder = useCancelOrder()
  const refundOrder = useRefundOrder()
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const isPending =
    fulfillOrder.isPending || markOrderShipped.isPending || markOrderDelivered.isPending || cancelOrder.isPending || refundOrder.isPending

  const handleFulfill = useCallback(() => {
    fulfillOrder.mutate({ orderId: order.id })
  }, [fulfillOrder, order.id])

  const handleConfirmShip = useCallback(
    (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => {
      markOrderShipped.mutate(
        { orderId: order.id, ...tracking },
        {
          onSuccess: () => {
            setShipDialogOpen(false)
          },
        },
      )
    },
    [markOrderShipped, order.id],
  )

  const handleMarkDelivered = useCallback(() => {
    markOrderDelivered.mutate({ orderId: order.id })
  }, [markOrderDelivered, order.id])

  const handleConfirmCancel = useCallback(() => {
    cancelOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          setCancelDialogOpen(false)
        },
      },
    )
  }, [cancelOrder, order.id])

  const handleConfirmRefund = useCallback(() => {
    refundOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          setRefundDialogOpen(false)
        },
      },
    )
  }, [order.id, refundOrder])

  const handlePrint = useCallback(() => {
    globalThis.print()
  }, [])

  return {
    canCancel: canCancelAdminOrder(order),
    canFulfill: canFulfillAdminOrder({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentUiKey: order.paymentUiKey,
      status: order.status,
    }),
    canMarkDelivered: canMarkAdminOrderDelivered(order),
    canPrint: canPrintAdminOrderInvoice(order),
    canRefund: canRefundAdminOrder(order),
    canShip: canMarkAdminOrderShipped({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentUiKey: order.paymentUiKey,
      status: order.status,
    }),
    cancelDialogOpen,
    handleConfirmCancel,
    handleConfirmRefund,
    handleConfirmShip,
    handleFulfill,
    handleMarkDelivered,
    handlePrint,
    isPending,
    refundDialogOpen,
    setCancelDialogOpen,
    setRefundDialogOpen,
    setShipDialogOpen,
    shipDialogOpen,
  }
}

interface UseOrderDetailActionsResult {
  readonly canCancel: boolean
  readonly canFulfill: boolean
  readonly canMarkDelivered: boolean
  readonly canPrint: boolean
  readonly canRefund: boolean
  readonly canShip: boolean
  readonly cancelDialogOpen: boolean
  readonly handleConfirmCancel: () => void
  readonly handleConfirmRefund: () => void
  readonly handleConfirmShip: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly handleFulfill: () => void
  readonly handleMarkDelivered: () => void
  readonly handlePrint: () => void
  readonly isPending: boolean
  readonly refundDialogOpen: boolean
  readonly setCancelDialogOpen: (open: boolean) => void
  readonly setRefundDialogOpen: (open: boolean) => void
  readonly setShipDialogOpen: (open: boolean) => void
  readonly shipDialogOpen: boolean
}

import { useCallback, useState } from "react"

import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderDelivered,
  canMarkAdminOrderShipped,
  canPrintAdminOrderSummary,
  canRefundAdminOrder,
  canRestockAdminOrder,
  cancelRefundsAdminOrderPayment,
  refundRestocksByDefault,
  resolveAdminOrderRefundBlocker,
} from "~/src/modules/order/order.admin-actions.utils"
import { type AdminOrderRefundBlocker } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderDelivered,
  useMarkOrderShipped,
  useRefundOrder,
  useRestockOrder,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

export const useOrderDetailActions = (order: Order["adminOrderDetail"]): UseOrderDetailActionsResult => {
  const fulfillOrder = useFulfillOrder()
  const markOrderShipped = useMarkOrderShipped()
  const markOrderDelivered = useMarkOrderDelivered()
  const cancelOrder = useCancelOrder()
  const refundOrder = useRefundOrder()
  const restockOrder = useRestockOrder()
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const isPending =
    fulfillOrder.isPending ||
    markOrderShipped.isPending ||
    markOrderDelivered.isPending ||
    cancelOrder.isPending ||
    refundOrder.isPending ||
    restockOrder.isPending

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

  const handleConfirmRefund = useCallback(
    (restock: boolean) => {
      refundOrder.mutate(
        { orderId: order.id, restock },
        {
          onSuccess: () => {
            setRefundDialogOpen(false)
          },
        },
      )
    },
    [order.id, refundOrder],
  )

  const handleConfirmRestock = useCallback(() => {
    restockOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          setRestockDialogOpen(false)
        },
      },
    )
  }, [order.id, restockOrder])

  return {
    canCancel: canCancelAdminOrder(order),
    canFulfill: canFulfillAdminOrder({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentUiKey: order.paymentUiKey,
      status: order.status,
    }),
    canMarkDelivered: canMarkAdminOrderDelivered(order),
    canPrintSummary: canPrintAdminOrderSummary(order),
    canRefund: canRefundAdminOrder(order),
    canRestock: canRestockAdminOrder(order),
    canShip: canMarkAdminOrderShipped({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentUiKey: order.paymentUiKey,
      status: order.status,
    }),
    cancelDialogOpen,
    cancelRefundsPayment: cancelRefundsAdminOrderPayment(order),
    handleConfirmCancel,
    handleConfirmRefund,
    handleConfirmRestock,
    handleConfirmShip,
    handleFulfill,
    handleMarkDelivered,
    isPending,
    refundBlocker: resolveAdminOrderRefundBlocker({
      hasOpenDispute: order.dispute !== undefined,
      totalMinorUnits: order.totalMinorUnits,
    }),
    refundDialogOpen,
    refundRestocksByDefault: refundRestocksByDefault(order),
    restockDialogOpen,
    setCancelDialogOpen,
    setRefundDialogOpen,
    setRestockDialogOpen,
    setShipDialogOpen,
    shipDialogOpen,
  }
}

interface UseOrderDetailActionsResult {
  readonly canCancel: boolean
  readonly canFulfill: boolean
  readonly canMarkDelivered: boolean
  readonly canPrintSummary: boolean
  readonly canRefund: boolean
  readonly canRestock: boolean
  readonly canShip: boolean
  readonly cancelDialogOpen: boolean
  readonly cancelRefundsPayment: boolean
  readonly handleConfirmCancel: () => void
  readonly handleConfirmRefund: (restock: boolean) => void
  readonly handleConfirmRestock: () => void
  readonly handleConfirmShip: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly handleFulfill: () => void
  readonly handleMarkDelivered: () => void
  readonly isPending: boolean
  readonly refundBlocker: AdminOrderRefundBlocker | undefined
  readonly refundDialogOpen: boolean
  readonly refundRestocksByDefault: boolean
  readonly restockDialogOpen: boolean
  readonly setCancelDialogOpen: (open: boolean) => void
  readonly setRefundDialogOpen: (open: boolean) => void
  readonly setRestockDialogOpen: (open: boolean) => void
  readonly setShipDialogOpen: (open: boolean) => void
  readonly shipDialogOpen: boolean
}

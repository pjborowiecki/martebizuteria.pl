import { useCallback, useState } from "react"

import { type AdminOrderCancelBlocker, type AdminOrderRefundBlocker } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderDelivered,
  canMarkAdminOrderShipped,
  canPrintAdminOrderSummary,
  canRefundAdminOrder,
  canRestockAdminOrder,
  canSetAdminOrderTrackingNumber,
  cancelRefundsAdminOrderPayment,
  refundRestocksByDefault,
  resolveAdminOrderCancelBlocker,
  resolveAdminOrderRefundBlocker,
} from "~/src/modules/order/order.utils"

import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderDelivered,
  useMarkOrderShipped,
  useRefundOrder,
  useRestockOrder,
  useSetOrderTrackingNumber,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

const useConfirmedOrderAction = (action: ConfirmableOrderAction, orderId: string): ConfirmedOrderAction => {
  const [open, setOpen] = useState(false)
  const confirm = useCallback(() => {
    action.mutate(
      { orderId },
      {
        onSuccess: () => {
          setOpen(false)
        },
      },
    )
  }, [action, orderId])

  return { confirm, open, setOpen }
}

const useTrackingNumberAction = (orderId: string): TrackingNumberAction => {
  const setOrderTrackingNumber = useSetOrderTrackingNumber()
  const [open, setOpen] = useState(false)
  const confirm = useCallback(
    (tracking: OrderTrackingInput) => {
      setOrderTrackingNumber.mutate(
        { orderId, ...tracking },
        {
          onSuccess: () => {
            setOpen(false)
          },
        },
      )
    },
    [orderId, setOrderTrackingNumber],
  )

  return { confirm, isPending: setOrderTrackingNumber.isPending, open, setOpen }
}

export const useOrderDetailActions = (order: Order["adminOrderDetail"]): UseOrderDetailActionsResult => {
  const hasOpenDispute = order.dispute !== undefined
  const fulfillOrder = useFulfillOrder()
  const markOrderShipped = useMarkOrderShipped()
  const markOrderDelivered = useMarkOrderDelivered()
  const cancelOrder = useCancelOrder()
  const refundOrder = useRefundOrder()
  const restockOrder = useRestockOrder()
  const fulfillAction = useConfirmedOrderAction(fulfillOrder, order.id)
  const deliverAction = useConfirmedOrderAction(markOrderDelivered, order.id)
  const cancelAction = useConfirmedOrderAction(cancelOrder, order.id)
  const restockAction = useConfirmedOrderAction(restockOrder, order.id)
  const trackingAction = useTrackingNumberAction(order.id)
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const isPending =
    fulfillOrder.isPending ||
    markOrderShipped.isPending ||
    markOrderDelivered.isPending ||
    cancelOrder.isPending ||
    refundOrder.isPending ||
    restockOrder.isPending ||
    trackingAction.isPending

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
    canSetTrackingNumber: canSetAdminOrderTrackingNumber(order),
    canShip: canMarkAdminOrderShipped({
      fulfillmentStatus: order.fulfillmentStatus,
      paymentUiKey: order.paymentUiKey,
      status: order.status,
    }),
    cancelBlocker: resolveAdminOrderCancelBlocker({
      hasOpenDispute,
      paymentUiKey: order.paymentUiKey,
      totalMinorUnits: order.totalMinorUnits,
    }),
    cancelDialogOpen: cancelAction.open,
    cancelRefundsPayment: cancelRefundsAdminOrderPayment(order),
    deliverDialogOpen: deliverAction.open,
    fulfillDialogOpen: fulfillAction.open,
    handleConfirmCancel: cancelAction.confirm,
    handleConfirmDelivered: deliverAction.confirm,
    handleConfirmFulfill: fulfillAction.confirm,
    handleConfirmRefund,
    handleConfirmRestock: restockAction.confirm,
    handleConfirmShip,
    handleConfirmTracking: trackingAction.confirm,
    isPending,
    refundBlocker: resolveAdminOrderRefundBlocker({
      hasOpenDispute,
      totalMinorUnits: order.totalMinorUnits,
    }),
    refundDialogOpen,
    refundRestocksByDefault: refundRestocksByDefault(order),
    restockDialogOpen: restockAction.open,
    setCancelDialogOpen: cancelAction.setOpen,
    setDeliverDialogOpen: deliverAction.setOpen,
    setFulfillDialogOpen: fulfillAction.setOpen,
    setRefundDialogOpen,
    setRestockDialogOpen: restockAction.setOpen,
    setShipDialogOpen,
    setTrackingDialogOpen: trackingAction.setOpen,
    shipDialogOpen,
    trackingDialogOpen: trackingAction.open,
  }
}

interface ConfirmableOrderAction {
  readonly mutate: (input: { readonly orderId: string }, options: { readonly onSuccess: () => void }) => void
}

interface OrderTrackingInput {
  readonly trackingNumber: string
  readonly trackingUrl: string | undefined
}

interface TrackingNumberAction {
  readonly confirm: (tracking: OrderTrackingInput) => void
  readonly isPending: boolean
  readonly open: boolean
  readonly setOpen: (open: boolean) => void
}

interface ConfirmedOrderAction {
  readonly confirm: () => void
  readonly open: boolean
  readonly setOpen: (open: boolean) => void
}

interface UseOrderDetailActionsResult {
  readonly canCancel: boolean
  readonly canFulfill: boolean
  readonly canMarkDelivered: boolean
  readonly canPrintSummary: boolean
  readonly canRefund: boolean
  readonly canRestock: boolean
  readonly canSetTrackingNumber: boolean
  readonly canShip: boolean
  readonly cancelBlocker: AdminOrderCancelBlocker | undefined
  readonly cancelDialogOpen: boolean
  readonly cancelRefundsPayment: boolean
  readonly deliverDialogOpen: boolean
  readonly fulfillDialogOpen: boolean
  readonly handleConfirmCancel: () => void
  readonly handleConfirmDelivered: () => void
  readonly handleConfirmFulfill: () => void
  readonly handleConfirmRefund: (restock: boolean) => void
  readonly handleConfirmRestock: () => void
  readonly handleConfirmShip: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly handleConfirmTracking: (tracking: OrderTrackingInput) => void
  readonly isPending: boolean
  readonly refundBlocker: AdminOrderRefundBlocker | undefined
  readonly refundDialogOpen: boolean
  readonly refundRestocksByDefault: boolean
  readonly restockDialogOpen: boolean
  readonly setCancelDialogOpen: (open: boolean) => void
  readonly setDeliverDialogOpen: (open: boolean) => void
  readonly setFulfillDialogOpen: (open: boolean) => void
  readonly setRefundDialogOpen: (open: boolean) => void
  readonly setRestockDialogOpen: (open: boolean) => void
  readonly setShipDialogOpen: (open: boolean) => void
  readonly setTrackingDialogOpen: (open: boolean) => void
  readonly shipDialogOpen: boolean
  readonly trackingDialogOpen: boolean
}

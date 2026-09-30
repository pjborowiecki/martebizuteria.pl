import { type MouseEvent, useCallback } from "react"

import { useNavigate, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderShipped,
  canPrintAdminOrderInvoice,
  canRefundAdminOrder,
} from "~/src/modules/order/order.admin-actions.utils"
import { type Order } from "~/src/modules/order/order.types"

import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderShipped,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

const resolveOrderRowActionAvailability = (order: Order["adminListItem"]): OrderRowActionAvailability => ({
  canCancel: canCancelAdminOrder(order),
  canFulfill: canFulfillAdminOrder(order),
  canPrint: canPrintAdminOrderInvoice(order),
  canRefund: canRefundAdminOrder(order),
  canShip: canMarkAdminOrderShipped(order),
})

export const useOrdersRowActionHandlers = (
  order: Order["adminListItem"],
  closeMenuAndRequestDeleteConfirm: () => void,
  handleConfirmOpenChange: (open: boolean) => void,
): UseOrdersRowActionHandlersResult => {
  const t = useTranslations("pages.admin.orders.rowActions")
  const navigate = useNavigate()
  const router = useRouter()
  const fulfillOrder = useFulfillOrder()
  const markOrderShipped = useMarkOrderShipped()
  const cancelOrder = useCancelOrder()
  const availability = resolveOrderRowActionAvailability(order)
  const isPending = fulfillOrder.isPending || markOrderShipped.isPending || cancelOrder.isPending
  const handleViewOrder = useCallback(() => {
    void navigate({
      params: {
        orderId: order.id,
      },
      to: "/admin/orders/$orderId",
    })
  }, [navigate, order.id])

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(order.id)
    toast.success(t("copySuccess"))
  }, [order.id, t])

  const handleFulfill = useCallback(() => {
    fulfillOrder.mutate({ orderId: order.id })
  }, [fulfillOrder, order.id])

  const handleMarkShipped = useCallback(() => {
    markOrderShipped.mutate({ orderId: order.id })
  }, [markOrderShipped, order.id])

  const handlePrintInvoice = useCallback(() => {
    const detailUrl = router.buildLocation({
      params: {
        orderId: order.id,
      },
      to: "/admin/orders/$orderId",
    }).href
    globalThis.open(detailUrl, "_blank", "noopener,noreferrer")
  }, [order.id, router])

  const handleRefund = useCallback(() => {
    void navigate({
      params: {
        orderId: order.id,
      },
      to: "/admin/orders/$orderId",
    })
  }, [navigate, order.id])

  const handleCancelRequest = useCallback(() => {
    suppressDataGridRowClickAfterDialogDismiss()
    closeMenuAndRequestDeleteConfirm()
  }, [closeMenuAndRequestDeleteConfirm])

  const handleConfirmCancel = useCallback(() => {
    cancelOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          handleConfirmOpenChange(false)
        },
      },
    )
  }, [cancelOrder, handleConfirmOpenChange, order.id])

  const handleStopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    suppressDataGridRowClickAfterDialogDismiss()
  }, [])

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      suppressDataGridRowClickAfterDialogDismiss()
      action()
    },
    [],
  )

  return {
    ...availability,
    handleCancelRequest,
    handleConfirmCancel,
    handleCopyId,
    handleFulfill,
    handleMarkShipped,
    handlePrintInvoice,
    handleRefund,
    handleStopRowClick,
    handleViewOrder,
    isPending,
    runMenuAction,
  }
}

interface OrderRowActionAvailability {
  readonly canCancel: boolean
  readonly canFulfill: boolean
  readonly canPrint: boolean
  readonly canRefund: boolean
  readonly canShip: boolean
}

interface UseOrdersRowActionHandlersResult extends OrderRowActionAvailability {
  readonly handleCancelRequest: () => void
  readonly handleConfirmCancel: () => void
  readonly handleCopyId: () => void
  readonly handleFulfill: () => void
  readonly handleMarkShipped: () => void
  readonly handlePrintInvoice: () => void
  readonly handleRefund: () => void
  readonly handleStopRowClick: (event: MouseEvent) => void
  readonly handleViewOrder: () => void
  readonly isPending: boolean
  readonly runMenuAction: (action: () => void) => (event: MouseEvent) => void
}

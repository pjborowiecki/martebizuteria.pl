import { type MouseEvent, useCallback } from "react"

import { useNavigate, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderShipped,
  canPrintAdminOrderSummary,
  canRefundAdminOrder,
  cancelRefundsAdminOrderPayment,
  resolveAdminOrderCancelBlocker,
} from "~/src/modules/order/order.admin-actions.utils"
import { type AdminOrderCancelBlocker } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderShipped,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

import { ROUTES } from "~/src/routes"

const resolveOrderRowActionAvailability = (order: Order["adminListItem"]): OrderRowActionAvailability => ({
  canCancel: canCancelAdminOrder(order),
  canFulfill: canFulfillAdminOrder(order),
  canPrintSummary: canPrintAdminOrderSummary(order),
  canRefund: canRefundAdminOrder(order),
  canShip: canMarkAdminOrderShipped(order),
  cancelBlocker: resolveAdminOrderCancelBlocker(order),
  cancelRefundsPayment: cancelRefundsAdminOrderPayment(order),
})

export const useOrdersRowActionHandlers = (
  order: Order["adminListItem"],
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

  const handleConfirmFulfill = useCallback(() => {
    fulfillOrder.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          handleConfirmOpenChange(false)
        },
      },
    )
  }, [fulfillOrder, handleConfirmOpenChange, order.id])

  const handleConfirmShip = useCallback(
    (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => {
      markOrderShipped.mutate(
        { orderId: order.id, ...tracking },
        {
          onSuccess: () => {
            handleConfirmOpenChange(false)
          },
        },
      )
    },
    [handleConfirmOpenChange, markOrderShipped, order.id],
  )

  const handlePrintSummary = useCallback(() => {
    const summaryUrl = router.buildLocation({
      params: {
        orderId: order.id,
      },
      to: ROUTES.ADMIN_ORDER_SUMMARY,
    }).publicHref
    globalThis.open(summaryUrl, "_blank", "noopener,noreferrer")
  }, [order.id, router])

  const handleRefund = useCallback(() => {
    void navigate({
      params: {
        orderId: order.id,
      },
      to: "/admin/orders/$orderId",
    })
  }, [navigate, order.id])

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
    handleConfirmCancel,
    handleConfirmFulfill,
    handleConfirmShip,
    handleCopyId,
    handlePrintSummary,
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
  readonly canPrintSummary: boolean
  readonly canRefund: boolean
  readonly canShip: boolean
  readonly cancelBlocker: AdminOrderCancelBlocker | undefined
  readonly cancelRefundsPayment: boolean
}

interface UseOrdersRowActionHandlersResult extends OrderRowActionAvailability {
  readonly handleConfirmCancel: () => void
  readonly handleConfirmFulfill: () => void
  readonly handleConfirmShip: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly handleCopyId: () => void
  readonly handlePrintSummary: () => void
  readonly handleRefund: () => void
  readonly handleStopRowClick: (event: MouseEvent) => void
  readonly handleViewOrder: () => void
  readonly isPending: boolean
  readonly runMenuAction: (action: () => void) => (event: MouseEvent) => void
}

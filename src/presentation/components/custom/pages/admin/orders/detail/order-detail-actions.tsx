import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { Barcode, CheckCheck, Loader2, Package, PackagePlus, Printer, RotateCcw, Truck, XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
  ADMIN_HEADER_SECONDARY_BUTTON_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { OrderActionButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-action-button"
import { OrderAdvanceDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-advance-dialog"
import { OrderRefundDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-dialog"
import { OrderShipDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-ship-dialog"
import { OrderTrackingDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tracking-dialog"
import { useOrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/use-order-detail-actions"

import { ROUTES } from "~/src/routes"

const OrderDetailActionDialogs = ({ actions, order }: Readonly<OrderDetailActionDialogsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail")

  return (
    <>
      <OrderAdvanceDialog
        displayId={order.displayId}
        emailedSteps={order.emailedSteps}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmFulfill}
        onOpenChange={actions.setFulfillDialogOpen}
        open={actions.fulfillDialogOpen}
        step="processing"
      />

      <OrderShipDialog
        emailedSteps={order.emailedSteps}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmShip}
        onOpenChange={actions.setShipDialogOpen}
        open={actions.shipDialogOpen}
      />

      <OrderTrackingDialog
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmTracking}
        onOpenChange={actions.setTrackingDialogOpen}
        open={actions.trackingDialogOpen}
      />

      <OrderAdvanceDialog
        displayId={order.displayId}
        emailedSteps={order.emailedSteps}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmDelivered}
        onOpenChange={actions.setDeliverDialogOpen}
        open={actions.deliverDialogOpen}
        step="delivered"
      />

      <OrderRefundDialog
        displayId={order.displayId}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmRefund}
        onOpenChange={actions.setRefundDialogOpen}
        open={actions.refundDialogOpen}
        restockByDefault={actions.refundRestocksByDefault}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("restockDialog.cancel")}
        confirmLabel={t("restockDialog.confirm")}
        description={t("restockDialog.description", { id: order.displayId })}
        icon={PackagePlus}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmRestock}
        onOpenChange={actions.setRestockDialogOpen}
        open={actions.restockDialogOpen}
        title={t("restockDialog.title")}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("cancelDialog.cancel")}
        confirmLabel={t("cancelDialog.confirm")}
        description={t(actions.cancelRefundsPayment ? "cancelDialog.refundDescription" : "cancelDialog.description", {
          id: order.displayId,
        })}
        icon={XCircle}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmCancel}
        onOpenChange={actions.setCancelDialogOpen}
        open={actions.cancelDialogOpen}
        title={t("cancelDialog.title")}
      />
    </>
  )
}

export const OrderDetailActions = ({ order }: Readonly<OrderDetailActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail")
  const actions = useOrderDetailActions(order)
  const {
    setCancelDialogOpen,
    setDeliverDialogOpen,
    setFulfillDialogOpen,
    setRefundDialogOpen,
    setRestockDialogOpen,
    setShipDialogOpen,
    setTrackingDialogOpen,
  } = actions
  const handleOpenFulfillDialog = useCallback(() => {
    setFulfillDialogOpen(true)
  }, [setFulfillDialogOpen])
  const handleOpenDeliverDialog = useCallback(() => {
    setDeliverDialogOpen(true)
  }, [setDeliverDialogOpen])
  const handleOpenShipDialog = useCallback(() => {
    setShipDialogOpen(true)
  }, [setShipDialogOpen])
  const handleOpenRefundDialog = useCallback(() => {
    setRefundDialogOpen(true)
  }, [setRefundDialogOpen])
  const handleOpenCancelDialog = useCallback(() => {
    setCancelDialogOpen(true)
  }, [setCancelDialogOpen])
  const handleOpenRestockDialog = useCallback(() => {
    setRestockDialogOpen(true)
  }, [setRestockDialogOpen])
  const handleOpenTrackingDialog = useCallback(() => {
    setTrackingDialogOpen(true)
  }, [setTrackingDialogOpen])

  return (
    <>
      {actions.canPrintSummary && (
        <LocalizedLink
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), ADMIN_HEADER_SECONDARY_BUTTON_CLASS)}
          params={{ orderId: order.id }}
          rel="noopener noreferrer"
          target="_blank"
          to={ROUTES.ADMIN_ORDER_SUMMARY}
        >
          <Printer className="size-3.5" strokeWidth={1.5} />
          {t("actions.printSummary")}
        </LocalizedLink>
      )}

      {actions.canRefund && (
        <OrderActionButton
          blockedReason={actions.refundBlocker === undefined ? undefined : t(`refundBlocked.${actions.refundBlocker}`)}
          isPending={actions.isPending}
          onClick={handleOpenRefundDialog}
        >
          <RotateCcw className="size-3.5" strokeWidth={1.5} />
          {t("actions.refund")}
        </OrderActionButton>
      )}

      {actions.canRestock && (
        <Button
          className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
          disabled={actions.isPending}
          onClick={handleOpenRestockDialog}
          size="sm"
          variant="outline"
        >
          <PackagePlus className="size-3.5" strokeWidth={1.5} />
          {t("actions.restock")}
        </Button>
      )}

      {actions.canCancel && (
        <OrderActionButton
          blockedReason={actions.cancelBlocker === undefined ? undefined : t(`cancelBlocked.${actions.cancelBlocker}`)}
          isPending={actions.isPending}
          onClick={handleOpenCancelDialog}
        >
          <XCircle className="size-3.5" strokeWidth={1.5} />
          {t("actions.cancel")}
        </OrderActionButton>
      )}

      {actions.canFulfill && (
        <Button className={ADMIN_HEADER_PRIMARY_BUTTON_CLASS} disabled={actions.isPending} onClick={handleOpenFulfillDialog} size="sm">
          {actions.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Package className="size-3.5" strokeWidth={1.5} />
          )}
          {t("actions.fulfill")}
        </Button>
      )}

      {actions.canShip && (
        <Button className={ADMIN_HEADER_PRIMARY_BUTTON_CLASS} disabled={actions.isPending} onClick={handleOpenShipDialog} size="sm">
          <Truck className="size-3.5" strokeWidth={1.5} />
          {t("actions.ship")}
        </Button>
      )}

      {actions.canSetTrackingNumber && (
        <Button
          className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
          disabled={actions.isPending}
          onClick={handleOpenTrackingDialog}
          size="sm"
          variant="outline"
        >
          <Barcode className="size-3.5" strokeWidth={1.5} />
          {t(order.trackingNumber === undefined ? "actions.addTracking" : "actions.changeTracking")}
        </Button>
      )}

      {actions.canMarkDelivered && (
        <Button className={ADMIN_HEADER_PRIMARY_BUTTON_CLASS} disabled={actions.isPending} onClick={handleOpenDeliverDialog} size="sm">
          {actions.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <CheckCheck className="size-3.5" strokeWidth={1.5} />
          )}
          {t("actions.markDelivered")}
        </Button>
      )}

      <OrderDetailActionDialogs actions={actions} order={order} />
    </>
  )
}

interface OrderDetailActionsProps {
  readonly order: Order["adminOrderDetail"]
}

interface OrderDetailActionDialogsProps extends OrderDetailActionsProps {
  readonly actions: ReturnType<typeof useOrderDetailActions>
}

import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { CheckCheck, Loader2, Package, PackagePlus, Printer, Truck, XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
  ADMIN_HEADER_SECONDARY_BUTTON_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { OrderRefundButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-button"
import { OrderRefundDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-dialog"
import { OrderShipDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-ship-dialog"
import { useOrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/use-order-detail-actions"

import { ROUTES } from "~/src/routes"

export const OrderDetailActions = ({ order }: Readonly<OrderDetailActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail")
  const actions = useOrderDetailActions(order)
  const { setCancelDialogOpen, setRefundDialogOpen, setRestockDialogOpen, setShipDialogOpen } = actions
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
        <OrderRefundButton blocker={actions.refundBlocker} isPending={actions.isPending} onClick={handleOpenRefundDialog} />
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
        <Button
          className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
          disabled={actions.isPending}
          onClick={handleOpenCancelDialog}
          size="sm"
          variant="outline"
        >
          <XCircle className="size-3.5" strokeWidth={1.5} />
          {t("actions.cancel")}
        </Button>
      )}

      {actions.canFulfill && (
        <Button className={ADMIN_HEADER_PRIMARY_BUTTON_CLASS} disabled={actions.isPending} onClick={actions.handleFulfill} size="sm">
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

      {actions.canMarkDelivered && (
        <Button className={ADMIN_HEADER_PRIMARY_BUTTON_CLASS} disabled={actions.isPending} onClick={actions.handleMarkDelivered} size="sm">
          {actions.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <CheckCheck className="size-3.5" strokeWidth={1.5} />
          )}
          {t("actions.markDelivered")}
        </Button>
      )}

      <OrderShipDialog
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmShip}
        onOpenChange={setShipDialogOpen}
        open={actions.shipDialogOpen}
      />

      <OrderRefundDialog
        displayId={order.displayId}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmRefund}
        onOpenChange={setRefundDialogOpen}
        open={actions.refundDialogOpen}
        restockByDefault={actions.refundRestocksByDefault}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("restockDialog.cancel")}
        confirmLabel={t("restockDialog.confirm")}
        description={t("restockDialog.description", { id: order.displayId })}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmRestock}
        onOpenChange={setRestockDialogOpen}
        open={actions.restockDialogOpen}
        title={t("restockDialog.title")}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("cancelDialog.cancel")}
        confirmLabel={t("cancelDialog.confirm")}
        description={t(actions.cancelRefundsPayment ? "cancelDialog.refundDescription" : "cancelDialog.description", {
          id: order.displayId,
        })}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmCancel}
        onOpenChange={setCancelDialogOpen}
        open={actions.cancelDialogOpen}
        title={t("cancelDialog.title")}
      />
    </>
  )
}

interface OrderDetailActionsProps {
  readonly order: Order["adminOrderDetail"]
}

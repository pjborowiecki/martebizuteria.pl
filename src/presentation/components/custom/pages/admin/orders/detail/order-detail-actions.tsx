import { type JSX, useCallback } from "react"

import { CheckCheck, Loader2, Package, Printer, Truck, XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import {
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
  ADMIN_HEADER_SECONDARY_BUTTON_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { OrderRefundButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-button"
import { OrderShipDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-ship-dialog"
import { useOrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/use-order-detail-actions"

export const OrderDetailActions = ({ order }: Readonly<OrderDetailActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail")
  const actions = useOrderDetailActions(order)
  const { setCancelDialogOpen, setRefundDialogOpen, setShipDialogOpen } = actions
  const handleOpenShipDialog = useCallback(() => {
    setShipDialogOpen(true)
  }, [setShipDialogOpen])
  const handleOpenRefundDialog = useCallback(() => {
    setRefundDialogOpen(true)
  }, [setRefundDialogOpen])
  const handleOpenCancelDialog = useCallback(() => {
    setCancelDialogOpen(true)
  }, [setCancelDialogOpen])

  return (
    <>
      <Button
        className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
        disabled={!actions.canPrint}
        onClick={actions.handlePrint}
        size="sm"
        variant="outline"
      >
        <Printer className="size-3.5" strokeWidth={1.5} />
        {t("actions.print")}
      </Button>

      {actions.canRefund && (
        <OrderRefundButton blocker={actions.refundBlocker} isPending={actions.isPending} onClick={handleOpenRefundDialog} />
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

      <CatalogDeleteConfirmDialog
        cancelLabel={t("refundDialog.cancel")}
        confirmLabel={t("refundDialog.confirm")}
        description={t("refundDialog.description", { id: order.displayId })}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmRefund}
        onOpenChange={setRefundDialogOpen}
        open={actions.refundDialogOpen}
        title={t("refundDialog.title")}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("cancelDialog.cancel")}
        confirmLabel={t("cancelDialog.confirm")}
        description={t("cancelDialog.description", { id: order.displayId })}
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

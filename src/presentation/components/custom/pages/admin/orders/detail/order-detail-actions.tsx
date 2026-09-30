import { type JSX, useCallback } from "react"

import { CheckCheck, Loader2, Package, Printer, RotateCcw, Truck, XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
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
      <Button className={SECONDARY_CLASS} disabled={!actions.canPrint} onClick={actions.handlePrint} size="sm" variant="outline">
        <Printer className="size-3.5" strokeWidth={1.5} />
        {t("actions.print")}
      </Button>

      {actions.canRefund && (
        <Button className={SECONDARY_CLASS} disabled={actions.isPending} onClick={handleOpenRefundDialog} size="sm" variant="outline">
          <RotateCcw className="size-3.5" strokeWidth={1.5} />
          {t("actions.refund")}
        </Button>
      )}

      {actions.canCancel && (
        <Button className={SECONDARY_CLASS} disabled={actions.isPending} onClick={handleOpenCancelDialog} size="sm" variant="outline">
          <XCircle className="size-3.5" strokeWidth={1.5} />
          {t("actions.cancel")}
        </Button>
      )}

      {actions.canFulfill && (
        <Button className={PRIMARY_CLASS} disabled={actions.isPending} onClick={actions.handleFulfill} size="sm">
          {actions.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Package className="size-3.5" strokeWidth={1.5} />
          )}
          {t("actions.fulfill")}
        </Button>
      )}

      {actions.canShip && (
        <Button className={PRIMARY_CLASS} disabled={actions.isPending} onClick={handleOpenShipDialog} size="sm">
          <Truck className="size-3.5" strokeWidth={1.5} />
          {t("actions.ship")}
        </Button>
      )}

      {actions.canMarkDelivered && (
        <Button className={PRIMARY_CLASS} disabled={actions.isPending} onClick={actions.handleMarkDelivered} size="sm">
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

const SECONDARY_CLASS =
  "h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"

const PRIMARY_CLASS = "h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90"

interface OrderDetailActionsProps {
  readonly order: Order["adminOrderDetail"]
}

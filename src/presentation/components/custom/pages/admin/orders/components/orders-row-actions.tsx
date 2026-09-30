import { type JSX, useMemo, useState } from "react"

import { Copy, Eye, MoreHorizontal, Package, Printer, RefreshCw, Trash2, Truck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"
import { useOrdersRowActionHandlers } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-row-action-handlers"

export const OrdersRowActions = ({ order }: Readonly<OrdersRowActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.rowActions")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const handlers = useOrdersRowActionHandlers(order, closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange)
  const trigger = useMemo(
    () => (
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={handlers.handleStopRowClick}
        onPointerDown={handlers.handleStopRowClick}
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handlers.handleStopRowClick],
  )

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} onClick={handlers.runMenuAction(handlers.handleViewOrder)}>
            <Eye className="size-4" strokeWidth={1.5} />
            {t("viewOrder")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={handlers.runMenuAction(handlers.handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyId", {
              id: order.id,
            })}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem
            className={ITEM_CLASS}
            disabled={!handlers.canFulfill || handlers.isPending}
            onClick={handlers.runMenuAction(handlers.handleFulfill)}
          >
            <Package className="size-4" strokeWidth={1.5} />
            {t("fulfill")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS}
            disabled={!handlers.canShip || handlers.isPending}
            onClick={handlers.runMenuAction(handlers.handleMarkShipped)}
          >
            <Truck className="size-4" strokeWidth={1.5} />
            {t("markShipped")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS}
            disabled={!handlers.canPrint}
            onClick={handlers.runMenuAction(handlers.handlePrintInvoice)}
          >
            <Printer className="size-4" strokeWidth={1.5} />
            {t("printInvoice")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} disabled={!handlers.canRefund} onClick={handlers.runMenuAction(handlers.handleRefund)}>
            <RefreshCw className="size-4" strokeWidth={1.5} />
            {t("refund")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS}
            disabled={!handlers.canCancel || handlers.isPending}
            variant="destructive"
            onClick={handlers.runMenuAction(handlers.handleCancelRequest)}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("cancel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {handlers.canCancel && (
        <CatalogDeleteConfirmDialog
          cancelLabel={t("cancelDialog.cancel")}
          confirmLabel={t("cancelDialog.confirm")}
          description={t("cancelDialog.description", {
            id: order.id,
          })}
          isPending={handlers.isPending}
          onConfirm={handlers.handleConfirmCancel}
          onOpenChange={handleConfirmOpenChange}
          open={confirmOpen}
          title={t("cancelDialog.title")}
        />
      )}
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

interface OrdersRowActionsProps {
  readonly order: Order["adminListItem"]
}

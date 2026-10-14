import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { Copy, Edit2, MoreHorizontal, TicketPercent, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type Discount } from "~/src/modules/discount/discount.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"
import { useCouponsSheet } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"
import { useDeleteCoupons } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-delete-coupons"

export const CouponsRowActions = ({ coupon }: Readonly<{ coupon: Discount["adminListItem"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const { openEdit } = useCouponsSheet()
  const deleteCoupons = useDeleteCoupons()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const { code, id } = coupon
  const handleEdit = useCallback(() => {
    openEdit(coupon)
  }, [coupon, openEdit])

  const handleCopyCode = useCallback(() => {
    void navigator.clipboard.writeText(code)
    toast.success(t("rowActions.copyCodeToast"))
  }, [code, t])

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id)
    toast.success(t("rowActions.copyIdToast"))
  }, [id, t])

  const handleConfirmDelete = useCallback(() => {
    deleteCoupons.mutate(
      { ids: [id] },
      {
        onSuccess: () => {
          toast.success(t("toast.deletedTitle"), { description: t("toast.deletedDescription", { code }) })
          handleConfirmOpenChange(false)
        },
      },
    )
  }, [code, deleteCoupons, handleConfirmOpenChange, id, t])

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      suppressNextDataGridRowClick()
      action()
    },
    [],
  )

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const trigger = useMemo(
    () => (
      <Button
        aria-label={t("columns.actions")}
        className="size-8"
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [stopRowClick, t],
  )

  return (
    <>
      <DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleEdit)}>
            <Edit2 className="size-4" strokeWidth={1.5} />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyCode)}>
            <TicketPercent className="size-4" strokeWidth={1.5} />
            {t("rowActions.copyCode")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("rowActions.copyId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(closeMenuAndRequestDeleteConfirm)} variant="destructive">
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t("deleteDialog.cancel")}
        confirmLabel={t("deleteDialog.confirm")}
        description={t("deleteDialog.description", { code })}
        isPending={deleteCoupons.isPending}
        onConfirm={handleConfirmDelete}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("deleteDialog.title")}
      />
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

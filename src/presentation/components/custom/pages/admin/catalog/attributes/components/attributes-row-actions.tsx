import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { Copy, Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { resolveProductAttributeTitle } from "~/src/modules/product-attribute/product-attribute.utils"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { useAttributesSheet } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-sheet"
import { useDeleteAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-delete-attributes"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"

export const AttributesRowActions = ({ attribute }: AttributesRowActionsProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes.rowActions")
  const locale = useLocale()
  const { openEdit } = useAttributesSheet()
  const deleteProductAttributes = useDeleteAttributes()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const { handle, id, titles } = attribute
  const title = resolveProductAttributeTitle(titles, locale)
  const handleEdit = useCallback(() => {
    openEdit(attribute)
  }, [attribute, openEdit])

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id)
    toast.success(t("copyIdToast"))
  }, [id, t])

  const handleCopyUrlSlug = useCallback(() => {
    void navigator.clipboard.writeText(handle)
    toast.success(t("copyUrlSlugToast"))
  }, [handle, t])

  const handleDelete = useCallback(() => {
    closeMenuAndRequestDeleteConfirm()
  }, [closeMenuAndRequestDeleteConfirm])

  const handleConfirmDelete = useCallback(() => {
    deleteProductAttributes.mutate([id], {
      onSuccess: () => {
        handleConfirmOpenChange(false)
      },
    })
  }, [deleteProductAttributes, handleConfirmOpenChange, id])

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
      <Button variant="ghost" size="icon" className="size-8" onClick={stopRowClick} onPointerDown={stopRowClick}>
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [stopRowClick],
  )

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleEdit)}>
            <Edit2 className="size-4" strokeWidth={1.5} />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyUrlSlug)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyUrlSlug")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} variant="destructive" onClick={runMenuAction(handleDelete)}>
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t("cancel")}
        confirmLabel={t("confirm")}
        description={t("deleteDescription", {
          title,
        })}
        isPending={deleteProductAttributes.isPending}
        onConfirm={handleConfirmDelete}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("deleteTitle")}
      />
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

interface AttributesRowActionsProps {
  readonly attribute: ProductAttribute["adminListItem"]
}

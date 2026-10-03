import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { useRouter } from "@tanstack/react-router"
import { Copy, Edit2, Link2, MoreHorizontal, PackageSearch, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { resolveProductTitle } from "~/src/modules/product/product.utils"

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
import { useDeleteProducts } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-delete-products"
import { useProductsSheet } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet"

export const ProductsRowActions = ({ product }: Readonly<ProductsRowActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const adminLocale = useLocale()
  const router = useRouter()
  const { openEdit } = useProductsSheet()
  const deleteProducts = useDeleteProducts()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const { handle, id, status } = product
  const storefrontHref = useMemo(
    () =>
      status === PRODUCT_STATUS.PUBLISHED
        ? router.buildLocation({
            params: {
              handle,
            },
            to: "/products/$handle",
          }).href
        : undefined,
    [handle, router, status],
  )

  const handleEdit = useCallback(() => {
    openEdit(product)
  }, [openEdit, product])

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id)
    toast.success(t("rowActions.copyIdToast"))
  }, [id, t])

  const storefrontActions = useMemo(
    () =>
      storefrontHref === undefined
        ? undefined
        : {
            copyLink: () => {
              void navigator.clipboard.writeText(`${globalThis.location.origin}${storefrontHref}`)
              toast.success(t("rowActions.copyLinkToast"))
            },
            view: () => {
              globalThis.open(storefrontHref, "_blank", "noopener,noreferrer")
            },
          },
    [storefrontHref, t],
  )

  const handleDelete = useCallback(() => {
    closeMenuAndRequestDeleteConfirm()
  }, [closeMenuAndRequestDeleteConfirm])

  const handleConfirmDelete = useCallback(() => {
    deleteProducts.mutate([id], {
      onSuccess: () => {
        handleConfirmOpenChange(false)
      },
    })
  }, [deleteProducts, handleConfirmOpenChange, id])

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
            {t("rowActions.edit")}
          </DropdownMenuItem>
          {storefrontActions !== undefined && (
            <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(storefrontActions.view)}>
              <PackageSearch className="size-4" strokeWidth={1.5} />
              {t("rowActions.viewStorefront")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("rowActions.copyId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          {storefrontActions !== undefined && (
            <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(storefrontActions.copyLink)}>
              <Link2 className="size-4" strokeWidth={1.5} />
              {t("rowActions.copyLink")}
            </DropdownMenuItem>
          )}
          {storefrontActions !== undefined && <DropdownMenuSeparator className="my-1.5" />}
          <DropdownMenuItem className={ITEM_CLASS} variant="destructive" onClick={runMenuAction(handleDelete)}>
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("rowActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t("rowActions.cancel")}
        confirmLabel={t("rowActions.confirm")}
        description={t("rowActions.deleteDescription", {
          title: resolveProductTitle(product.titles, adminLocale),
        })}
        isPending={deleteProducts.isPending}
        onConfirm={handleConfirmDelete}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("rowActions.deleteTitle")}
      />
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

interface ProductsRowActionsProps {
  readonly product: Product["adminListItem"]
}

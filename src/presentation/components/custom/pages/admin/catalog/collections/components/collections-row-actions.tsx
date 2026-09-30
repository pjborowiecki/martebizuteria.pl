import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { useRouter } from "@tanstack/react-router"
import { Copy, Edit2, Link2, MoreHorizontal, PackageSearch, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { useCollectionsSheet } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet"
import { useDeleteCollections } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"

export const CollectionsRowActions = ({ collection }: CollectionsRowActionsProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections.rowActions")
  const adminLocale = useLocale()
  const router = useRouter()
  const { openEdit } = useCollectionsSheet()
  const deleteCollections = useDeleteCollections()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const { handle, id } = collection
  const storefrontHref = useMemo(
    () =>
      router.buildLocation({
        params: {
          handle,
        },
        to: "/collections/$handle",
      }).href,
    [router, handle],
  )

  const handleEdit = useCallback(() => {
    openEdit(collection)
  }, [collection, openEdit])

  const handleViewProducts = useCallback(() => {
    globalThis.open(storefrontHref, "_blank", "noopener,noreferrer")
  }, [storefrontHref])

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id)
    toast.success(t("copyIdToast"))
  }, [id, t])

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(`${globalThis.location.origin}${storefrontHref}`)
    toast.success(t("copyLinkToast"))
  }, [storefrontHref, t])

  const handleDelete = useCallback(() => {
    closeMenuAndRequestDeleteConfirm()
  }, [closeMenuAndRequestDeleteConfirm])

  const handleConfirmDelete = useCallback(() => {
    deleteCollections.mutate([id], {
      onSuccess: () => {
        handleConfirmOpenChange(false)
      },
    })
  }, [deleteCollections, handleConfirmOpenChange, id])

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
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleViewProducts)}>
            <PackageSearch className="size-4" strokeWidth={1.5} />
            {t("viewProducts")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyLink)}>
            <Link2 className="size-4" strokeWidth={1.5} />
            {t("copyLink")}
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
          title: resolveCollectionTitle(collection.titles, adminLocale),
        })}
        isPending={deleteCollections.isPending}
        onConfirm={handleConfirmDelete}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("deleteTitle")}
      />
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

interface CollectionsRowActionsProps {
  readonly collection: ProductCollection["adminListItem"]
}

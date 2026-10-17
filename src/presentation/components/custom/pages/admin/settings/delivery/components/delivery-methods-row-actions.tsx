import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { Archive, ArchiveRestore, Edit2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

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
import { useDeliveryMethodSheet } from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-method-sheet"
import { useDeliveryMethodActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/use-delivery-method-actions"

export const DeliveryMethodsRowActions = ({ method }: Readonly<{ method: DeliveryMethod["adminMethod"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const locale = useLocale()
  const { openEdit } = useDeliveryMethodSheet()
  const { archive } = useDeliveryMethodActions()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )
  const name = resolveLocalizedString(method.names, locale)
  const archived = method.archivedAt !== undefined

  const handleConfirmArchive = useCallback(() => {
    void archive.mutateAsync({ archived: true, id: method.id }).then(
      () => {
        toast.success(t("methods.archivedToast", { name }))
        handleConfirmOpenChange(false)
      },
      () => {},
    )
  }, [archive, handleConfirmOpenChange, method.id, name, t])

  const handleRestore = useCallback(() => {
    void archive.mutateAsync({ archived: false, id: method.id }).then(
      () => {
        toast.success(t("methods.restored", { name }))
      },
      () => {},
    )
  }, [archive, method.id, name, t])

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
        aria-label={t("rowActions.menu", { name })}
        className="size-8"
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [name, stopRowClick, t],
  )

  return (
    <>
      <DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          {archived ? (
            <DropdownMenuItem className={ITEM_CLASS} disabled={archive.isPending} onClick={runMenuAction(handleRestore)}>
              <ArchiveRestore className="size-4" strokeWidth={1.5} />
              {t("rowActions.restore")}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={runMenuAction(() => {
                  openEdit(method)
                })}
              >
                <Edit2 className="size-4" strokeWidth={1.5} />
                {t("rowActions.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(closeMenuAndRequestDeleteConfirm)} variant="destructive">
                <Archive className="size-4" strokeWidth={1.5} />
                {t("rowActions.archive")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t("archiveDialog.cancel")}
        confirmLabel={t("archiveDialog.confirm")}
        description={t("archiveDialog.description")}
        icon={Archive}
        isPending={archive.isPending}
        onConfirm={handleConfirmArchive}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("archiveDialog.title", { name })}
      />
    </>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"

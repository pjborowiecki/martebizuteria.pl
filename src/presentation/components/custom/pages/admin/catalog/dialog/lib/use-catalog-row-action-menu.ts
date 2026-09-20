import { useCallback, useState } from "react"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import {
  requestCatalogConfirmDialog,
  suppressDataGridRowClickAfterCatalogDialogDismiss,
} from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/catalog-dialog.utils"

export const useCatalogRowActionMenu = (confirmOpen: boolean, setConfirmOpen: (open: boolean) => void): UseCatalogRowActionMenuResult => {
  const [menuOpen, setMenuOpen] = useState(false)
  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      if (confirmOpen) {
        setMenuOpen(false)
        return
      }
      setMenuOpen(open)
      if (!open) {
        suppressNextDataGridRowClick()
      }
    },
    [confirmOpen],
  )
  const handleConfirmOpenChange = useCallback(
    (open: boolean) => {
      suppressDataGridRowClickAfterCatalogDialogDismiss()
      setConfirmOpen(open)
      if (!open) {
        setMenuOpen(false)
      }
    },
    [setConfirmOpen],
  )
  const closeMenuAndRequestDeleteConfirm = useCallback(() => {
    suppressDataGridRowClickAfterCatalogDialogDismiss()
    setMenuOpen(false)
    requestCatalogConfirmDialog(setConfirmOpen)
  }, [setConfirmOpen])
  return {
    closeMenuAndRequestDeleteConfirm,
    handleConfirmOpenChange,
    handleMenuOpenChange,
    menuOpen,
  }
}
interface UseCatalogRowActionMenuResult {
  readonly closeMenuAndRequestDeleteConfirm: () => void
  readonly handleConfirmOpenChange: (open: boolean) => void
  readonly handleMenuOpenChange: (open: boolean) => void
  readonly menuOpen: boolean
}

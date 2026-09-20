import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"

/** Opens a dialog after the current menu/popover closes (avoids focus-dismiss races). */
export const requestCatalogConfirmDialog = (setOpen: (open: boolean) => void): void => {
  suppressDataGridRowClickAfterDialogDismiss()
  queueMicrotask(() => {
    suppressDataGridRowClickAfterDialogDismiss()
    setOpen(true)
  })
}
export { suppressDataGridRowClickAfterDialogDismiss as suppressDataGridRowClickAfterCatalogDialogDismiss } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"

import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"

export const requestCatalogConfirmDialog = (setOpen: (open: boolean) => void): void => {
  suppressDataGridRowClickAfterDialogDismiss()
  queueMicrotask(() => {
    suppressDataGridRowClickAfterDialogDismiss()
    setOpen(true)
  })
}

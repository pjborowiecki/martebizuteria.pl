/** Opens a dialog after the current menu/popover closes (avoids focus-dismiss races). */
export function requestCatalogConfirmDialog(setOpen: (open: boolean) => void): void {
  queueMicrotask(() => {
    setOpen(true);
  });
}

export { suppressDataGridRowClickAfterDialogDismiss as suppressDataGridRowClickAfterCatalogDialogDismiss } from "~/src/components/custom/datagrid/lib/data-grid-row-click";

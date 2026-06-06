import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/components/custom/datagrid/lib/data-grid-row-click";

/** Opens a dialog after the current menu/popover closes (avoids focus-dismiss races). */
export function requestCatalogConfirmDialog(setOpen: (open: boolean) => void): void {
  suppressDataGridRowClickAfterDialogDismiss();

  queueMicrotask(() => {
    suppressDataGridRowClickAfterDialogDismiss();
    setOpen(true);
  });
}

export { suppressDataGridRowClickAfterDialogDismiss as suppressDataGridRowClickAfterCatalogDialogDismiss } from "~/src/components/custom/datagrid/lib/data-grid-row-click";

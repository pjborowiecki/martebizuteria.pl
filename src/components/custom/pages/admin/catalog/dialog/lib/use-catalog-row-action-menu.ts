import { useCallback, useState } from "react";

import { suppressNextDataGridRowClick } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import {
  requestCatalogConfirmDialog,
  suppressDataGridRowClickAfterCatalogDialogDismiss
} from "~/src/components/custom/pages/admin/catalog/dialog/lib/catalog-dialog.utils";

interface UseCatalogRowActionMenuResult {
  readonly closeMenuAndRequestDeleteConfirm: () => void;
  readonly handleConfirmOpenChange: (open: boolean) => void;
  readonly handleMenuOpenChange: (open: boolean) => void;
  readonly menuOpen: boolean;
}

/** Keeps the row-action menu closed while delete confirm is open and after dismiss. */
export function useCatalogRowActionMenu(confirmOpen: boolean, setConfirmOpen: (open: boolean) => void): UseCatalogRowActionMenuResult {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      if (confirmOpen) {
        setMenuOpen(false);
        return;
      }

      setMenuOpen(open);

      if (!open) {
        suppressNextDataGridRowClick();
      }
    },
    [confirmOpen]
  );

  const handleConfirmOpenChange = useCallback(
    (open: boolean) => {
      setConfirmOpen(open);

      if (!open) {
        setMenuOpen(false);
        suppressDataGridRowClickAfterCatalogDialogDismiss();
      }
    },
    [setConfirmOpen]
  );

  const closeMenuAndRequestDeleteConfirm = useCallback(() => {
    setMenuOpen(false);
    requestCatalogConfirmDialog(setConfirmOpen);
  }, [setConfirmOpen]);

  return {
    closeMenuAndRequestDeleteConfirm,
    handleConfirmOpenChange,
    handleMenuOpenChange,
    menuOpen
  };
}

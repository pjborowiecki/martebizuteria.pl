import { type JSX, useCallback, useMemo, useState } from "react";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "~/src/components/shadcn/alert-dialog";
import { Button } from "~/src/components/shadcn/button";

import { useDeleteCollections } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

const NO_SELECTION = 0;

/** Selection summary + batch-delete action, shown only while rows are selected. */
export function CollectionsBulkActions(): JSX.Element | undefined {
  const t = useTranslations("admin");
  const { table } = collectionsDataGrid.useDataGrid();
  const [open, setOpen] = useState(false);
  const deleteCollections = useDeleteCollections();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const count = String(selectedRows.length);

  const handleConfirm = useCallback(() => {
    const ids = selectedRows.map((row) => row.original.id);
    deleteCollections.mutate(ids, {
      onSuccess: () => {
        table.resetRowSelection();
        setOpen(false);
      }
    });
  }, [selectedRows, deleteCollections, table]);

  const trigger = useMemo(
    () => (
      <Button variant="outline" size="sm" className="h-9 gap-2 border-destructive/30 text-xs text-destructive hover:bg-destructive/10">
        <Trash2 className="size-3.5" strokeWidth={1.5} />
        {t("collections.bulk.delete", { count })}
      </Button>
    ),
    [t, count]
  );

  if (selectedRows.length === NO_SELECTION) {
    return undefined;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{t("collections.bulk.selected", { count })}</span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={trigger} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("collections.bulk.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("collections.bulk.confirmDescription", { count })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCollections.isPending}>{t("collections.bulk.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={deleteCollections.isPending} className="gap-1.5">
              {deleteCollections.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("collections.bulk.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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

import { useDeleteCategories } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-delete-categories";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

const NO_SELECTION = 0;

/** Selection summary + batch-delete action, shown only while rows are selected. */
export function CategoriesBulkActions(): JSX.Element | undefined {
  const t = useTranslations("pages.admin.catalog.categories");
  const { table } = categoriesDataGrid.useDataGrid();
  const [open, setOpen] = useState(false);
  const deleteCategories = useDeleteCategories();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const count = String(selectedRows.length);

  const handleConfirm = useCallback(() => {
    const ids = selectedRows.map((row) => row.original.id);
    deleteCategories.mutate(ids, {
      onSuccess: () => {
        table.resetRowSelection();
        setOpen(false);
      }
    });
  }, [selectedRows, deleteCategories, table]);

  const trigger = useMemo(
    () => (
      <Button variant="outline" size="sm" className="h-9 gap-2 border-destructive/30 text-xs text-destructive hover:bg-destructive/10">
        <Trash2 className="size-3.5" strokeWidth={1.5} />
        {t("bulk.delete", { count })}
      </Button>
    ),
    [t, count]
  );

  if (selectedRows.length === NO_SELECTION) {
    return undefined;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{t("bulk.selected", { count })}</span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={trigger} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulk.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bulk.confirmDescription", { count })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategories.isPending}>{t("bulk.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={deleteCategories.isPending} className="gap-1.5">
              {deleteCategories.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("bulk.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

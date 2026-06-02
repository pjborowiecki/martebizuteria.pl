import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

export function CollectionsExportAction(): JSX.Element {
  const t = useTranslations("admin");
  const { table } = collectionsDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const headers = ["ID", "Name", "Handle", "Status", "Products", "Description"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { description, handle, id, productCount, status, title } = row.original;

        // Escape quotes by doubling them up
        const escapedTitle = title.replaceAll('"', '""');
        const escapedDescription = (description ?? "").replaceAll('"', '""');

        return [id, `"${escapedTitle}"`, handle, status, productCount, `"${escapedDescription}"`].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "collections.csv");
    link.rel = "noopener";
    link.click();
    URL.revokeObjectURL(url);
  }, [table]);

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("collections.actions.exportCsv")} onClick={handleExport}>
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, t]
  );

  return <DataGridIconTooltip label={t("collections.actions.exportCsv")} trigger={button} />;
}

import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

export function CategoriesExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const { table } = categoriesDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const headers = ["ID", "Title", "Handle", "Subtitle", "Short description", "Parent", "Status", "Products", "Description"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { description, handle, id, parentTitle, productCount, shortDescription, status, subtitle, title } = row.original;

        return [
          id,
          `"${escapeCsvField(title)}"`,
          handle,
          `"${escapeCsvField(subtitle ?? "")}"`,
          `"${escapeCsvField(shortDescription ?? "")}"`,
          `"${escapeCsvField(parentTitle ?? "")}"`,
          status,
          productCount,
          `"${escapeCsvField(description ?? "")}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "categories.csv");
    link.rel = "noopener";
    link.click();
    URL.revokeObjectURL(url);
  }, [table]);

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("actions.exportCsv")} onClick={handleExport}>
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, t]
  );

  return <DataGridIconTooltip label={t("actions.exportCsv")} trigger={button} />;
}

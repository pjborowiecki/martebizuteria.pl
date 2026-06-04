import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useTranslations } from "use-intl";

import { LOCALES } from "~/src/constants/_constants/locales";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { attributesDataGrid } from "~/src/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid";

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

export function AttributesExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { table } = attributesDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const titleHeaders = LOCALES.map((locale) => `Title ${locale.toUpperCase()}`);
    const headers = ["ID", ...titleHeaders, "Handle", "Type", "Unit", "Products"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { handle, id, productCount, titles, type, unit } = row.original;
        const titleCells = LOCALES.map((locale) => `"${escapeCsvField(titles[locale])}"`);

        return [id, ...titleCells, handle, type, `"${escapeCsvField(unit ?? "")}"`, productCount].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "attributes.csv");
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

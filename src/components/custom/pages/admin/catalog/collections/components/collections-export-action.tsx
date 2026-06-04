import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";

import { LOCALES } from "~/src/constants/_constants/locales";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

import { resolveCollectionDescription } from "~/src/modules/product-collection/product-collection.utils";

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

export function CollectionsExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const locale = useLocale();
  const { table } = collectionsDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const titleHeaders = LOCALES.map((code) => `Name ${code.toUpperCase()}`);
    const headers = ["ID", ...titleHeaders, "Handle", "Status", "Products", "Description"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { descriptions, handle, id, productCount, status, titles } = row.original;
        const titleCells = LOCALES.map((code) => `"${escapeCsvField(titles[code])}"`);

        return [
          id,
          ...titleCells,
          handle,
          status,
          productCount,
          `"${escapeCsvField(resolveCollectionDescription(descriptions, locale))}"`
        ].join(",");
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
  }, [locale, table]);

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

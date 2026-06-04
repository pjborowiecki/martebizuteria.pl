import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";

import { LOCALES } from "~/src/constants/_constants/locales";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

import {
  resolveCategoryDescription,
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle
} from "~/src/modules/product-category/product-category.utils";

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

export function CategoriesExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const locale = useLocale();
  const { table } = categoriesDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const titleHeaders = LOCALES.map((code) => `Title ${code.toUpperCase()}`);
    const headers = ["ID", ...titleHeaders, "Handle", "Subtitle", "Short description", "Parent", "Status", "Products", "Description"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { descriptions, handle, id, parentTitles, productCount, shortDescriptions, status, subtitles, titles } = row.original;
        const titleCells = LOCALES.map((code) => `"${escapeCsvField(titles[code])}"`);
        const parentTitle = parentTitles === undefined ? "" : resolveCategoryTitle(parentTitles, locale);

        return [
          id,
          ...titleCells,
          handle,
          `"${escapeCsvField(resolveCategorySubtitle(subtitles, locale))}"`,
          `"${escapeCsvField(resolveCategoryShortDescription(shortDescriptions, locale))}"`,
          `"${escapeCsvField(parentTitle)}"`,
          status,
          productCount,
          `"${escapeCsvField(resolveCategoryDescription(descriptions, locale))}"`
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

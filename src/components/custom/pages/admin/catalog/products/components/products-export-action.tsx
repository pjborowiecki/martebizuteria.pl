import { type JSX, useCallback, useMemo } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { productsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/utils/products-data-grid";

import { resolveProductTitle } from "~/src/modules/product/product.utils";

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

export function ProductsExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const locale = useLocale();
  const { table } = productsDataGrid.useDataGrid();

  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel();
    const headers = ["ID", "Title", "Handle", "Status", "Categories", "Collections", "Min price", "Stock", "Variants"];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { categoryTitles, collectionTitles, handle, id, minPrice, status, titles, totalStock, variantCount } = row.original;
        const title = resolveProductTitle(titles, locale);

        return [
          id,
          `"${escapeCsvField(title)}"`,
          handle,
          status,
          `"${escapeCsvField(categoryTitles ?? "")}"`,
          `"${escapeCsvField(collectionTitles ?? "")}"`,
          minPrice ?? "",
          totalStock,
          variantCount
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "products.csv");
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

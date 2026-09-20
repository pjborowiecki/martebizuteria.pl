import { type JSX, useCallback, useMemo, useState } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl"

import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { fetchAdminProductsExportFn } from "~/src/modules/product/use-cases/export-admin-products"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { useProductsDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"

const escapeCsvField = (value: string): string => value.replaceAll('"', '""')

const buildProductsCsvRows = (
  rows: readonly {
    readonly categoryTitles?: string | undefined
    readonly collectionTitles?: string | null | undefined
    readonly handle: string
    readonly id: string
    readonly minPrice?: number | undefined
    readonly status: string
    readonly skuSummary?: string | undefined
    readonly titles: unknown
    readonly totalStock: number
    readonly variantCount: number
  }[],
  locale: string,
): string[] =>
  rows.map((row) => {
    const { categoryTitles, collectionTitles, handle, id, minPrice, skuSummary, status, titles, totalStock, variantCount } = row
    const title = resolveProductTitle(titles, locale)

    return [
      id,
      `"${escapeCsvField(title)}"`,
      handle,
      `"${escapeCsvField(skuSummary ?? "")}"`,
      status,
      `"${escapeCsvField(categoryTitles ?? "")}"`,
      `"${escapeCsvField(collectionTitles ?? "")}"`,
      minPrice ?? "",
      totalStock,
      variantCount,
    ].join(",")
  })

export const ProductsExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const locale = useLocale()
  const { exportListInput, hasServerListQuery, table } = useProductsDataGridContext()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(() => {
    void (async () => {
      setIsExporting(true)

      try {
        const headers = ["ID", "Title", "Handle", "SKU", "Status", "Categories", "Collections", "Min price", "Stock", "Variants"]
        const rows = hasServerListQuery
          ? await fetchAdminProductsExportFn({ data: exportListInput })
          : table.getFilteredRowModel().rows.map((row) => row.original)

        const csvContent = [headers.join(","), ...buildProductsCsvRows(rows, locale)].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")

        link.href = url
        link.setAttribute("download", "products.csv")
        link.rel = "noopener"
        link.click()
        URL.revokeObjectURL(url)
      } finally {
        setIsExporting(false)
      }
    })()
  }, [exportListInput, hasServerListQuery, locale, table])

  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("actions.exportCsv")}
        aria-busy={isExporting}
        disabled={isExporting}
        onClick={handleExport}
      >
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, isExporting, t],
  )

  return <DataGridIconTooltip label={t("actions.exportCsv")} trigger={button} />
}

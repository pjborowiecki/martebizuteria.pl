import { type JSX, useCallback, useMemo } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"
import { resolveCollectionDescription } from "~/src/modules/product-collection/product-collection.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

export const CollectionsExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const locale = useLocale()
  const { table } = collectionsDataGrid.useDataGrid()
  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel()
    const titleHeaders = I18N.SUPPORTED_LOCALES.map((code) => `Name ${code.toUpperCase()}`)
    const headers = ["ID", ...titleHeaders, "Handle", "Status", "Products", "Description"]
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { descriptions, handle, id, productCount, status, titles } = row.original
        const titleCells = I18N.SUPPORTED_LOCALES.map((code) => `"${escapeCsvField(titles[code])}"`)

        return [
          id,
          ...titleCells,
          handle,
          status,
          productCount,
          `"${escapeCsvField(resolveCollectionDescription(descriptions, locale))}"`,
        ].join(",")
      }),
    ].join("\n")

    downloadCsvFile("collections.csv", csvContent)
  }, [locale, table])

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("actions.exportCsv")} onClick={handleExport}>
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, t],
  )

  return <DataGridIconTooltip label={t("actions.exportCsv")} trigger={button} />
}

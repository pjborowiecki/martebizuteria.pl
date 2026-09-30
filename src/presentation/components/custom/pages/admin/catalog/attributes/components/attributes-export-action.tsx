import { type JSX, useCallback, useMemo } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { attributesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid"

export const AttributesExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const { table } = attributesDataGrid.useDataGrid()
  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel()
    const titleHeaders = I18N.SUPPORTED_LOCALES.map((locale) => `Title ${locale.toUpperCase()}`)
    const headers = ["ID", ...titleHeaders, "Handle", "Type", "Unit", "Products"]
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { handle, id, productCount, titles, type, unit } = row.original
        const titleCells = I18N.SUPPORTED_LOCALES.map((locale) => `"${escapeCsvField(titles[locale])}"`)

        return [id, ...titleCells, handle, type, `"${escapeCsvField(unit ?? "")}"`, productCount].join(",")
      }),
    ].join("\n")

    downloadCsvFile("attributes.csv", csvContent)
  }, [table])

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

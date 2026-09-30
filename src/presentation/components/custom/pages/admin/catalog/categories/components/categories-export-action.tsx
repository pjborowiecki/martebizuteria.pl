import { type JSX, useCallback, useMemo } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"
import {
  resolveCategoryDescription,
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle,
} from "~/src/modules/product-category/product-category.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { categoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"

export const CategoriesExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const locale = useLocale()
  const { table } = categoriesDataGrid.useDataGrid()
  const handleExport = useCallback(() => {
    const { rows } = table.getFilteredRowModel()
    const titleHeaders = I18N.SUPPORTED_LOCALES.map((code) => `Title ${code.toUpperCase()}`)
    const headers = ["ID", ...titleHeaders, "Handle", "Subtitle", "Short description", "Parent", "Status", "Products", "Description"]
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const { descriptions, handle, id, parentTitles, productCount, shortDescriptions, status, subtitles, titles } = row.original
        const titleCells = I18N.SUPPORTED_LOCALES.map((code) => `"${escapeCsvField(titles[code])}"`)
        const parentTitle = parentTitles === undefined ? "" : resolveCategoryTitle(parentTitles, locale)

        return [
          id,
          ...titleCells,
          handle,
          `"${escapeCsvField(resolveCategorySubtitle(subtitles, locale))}"`,
          `"${escapeCsvField(resolveCategoryShortDescription(shortDescriptions, locale))}"`,
          `"${escapeCsvField(parentTitle)}"`,
          status,
          productCount,
          `"${escapeCsvField(resolveCategoryDescription(descriptions, locale))}"`,
        ].join(",")
      }),
    ].join("\n")

    downloadCsvFile("categories.csv", csvContent)
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

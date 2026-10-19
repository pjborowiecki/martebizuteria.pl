import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { type RowData, type Table } from "@tanstack/react-table"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { useActionError } from "~/src/hooks/use-action-error"
import { useDisplayTimeZone, useFormatLocale } from "~/src/hooks/use-display-format"

import {
  type DataGridExportSource,
  buildDataGridExportDocument,
  exportFilter,
  getDataGridDisplayedRows,
  getDataGridExportColumns,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { getDataGridSearch } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { downloadTextFile } from "~/src/presentation/components/custom/datagrid/lib/download"
import {
  TABLE_EXPORT_MIME_TYPES,
  type TableExportFormat,
  buildTableExportFileName,
  serializeTableExport,
} from "~/src/presentation/components/custom/datagrid/lib/table-export"

export const useDataGridExport = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
  source: DataGridExportSource<TData>,
): UseMutationResult<void, Error, TableExportFormat> => {
  const t = useTranslations("components.datagrid")
  const timeZone = useDisplayTimeZone()
  const formatLocale = useFormatLocale()
  const describeError = useActionError()

  return useMutation({
    mutationFn: async (format: TableExportFormat) => {
      const columns = getDataGridExportColumns(table)
      const search = source.loadRows === undefined ? getDataGridSearch(table) : source.search
      const filters = [...source.filters, ...exportFilter(t("export.filters.search"), search)]
      const rows = source.loadRows === undefined ? getDataGridDisplayedRows(table) : await source.loadRows()
      const document = buildDataGridExportDocument({
        columns,
        exportedAt: new Date(),
        filters,
        formatLocale,
        list: source.list,
        rows,
        timeZone,
        title: source.title,
      })
      const labels = {
        exportedAt: t("export.text.exportedAt"),
        filters: t("export.text.filters"),
        noFilters: t("export.text.noFilters"),
        rowCount: t("export.text.rowCount"),
      }

      downloadTextFile({
        content: serializeTableExport(document, format, labels),
        fileName: buildTableExportFileName(document, format),
        mimeType: TABLE_EXPORT_MIME_TYPES[format],
      })
    },
    onError: (error) => {
      toast.error(t("export.failed"), { description: describeError(error) })
    },
  })
}

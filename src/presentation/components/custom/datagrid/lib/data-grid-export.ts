import { type RowData, type Table } from "@tanstack/react-table"
import { type useTranslations } from "use-intl/react"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type TableExportDocument, type TableExportFilter } from "~/src/modules/_core/utils/table-export"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { getDataGridColumnLabel, getDataGridLayoutColumns } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export interface DataGridExportSource<TData extends RowData> {
  readonly filters: readonly TableExportFilter[]
  readonly list: string
  readonly loadRows?: (() => Promise<readonly TData[]>) | undefined
  readonly search?: string | undefined
  readonly title: string
}

export interface DataGridExportColumn<TData extends RowData> {
  readonly id: string
  readonly label: string
  readonly value: (row: TData) => string | undefined
}

interface DataGridExportDocumentInput<TData extends RowData> extends Omit<TableExportDocument, "columns" | "rows"> {
  readonly columns: readonly DataGridExportColumn<TData>[]
  readonly rows: readonly TData[]
}

export const getDataGridExportColumns = <TData extends RowData>(table: Table<DataGridFeatures, TData>): DataGridExportColumn<TData>[] =>
  getDataGridLayoutColumns(table).flatMap((column) => {
    const exportValue = column.columnDef.meta?.exportValue

    return exportValue === undefined ? [] : [{ id: column.id, label: getDataGridColumnLabel(column), value: exportValue }]
  })

export const getDataGridDisplayedRows = <TData extends RowData>(table: Table<DataGridFeatures, TData>): TData[] =>
  table.getPrePaginatedRowModel().rows.map((row) => row.original)

export const buildDataGridExportDocument = <TData extends RowData>({
  columns,
  rows,
  ...document
}: DataGridExportDocumentInput<TData>): TableExportDocument => ({
  ...document,
  columns: columns.map(({ id, label }) => ({ id, label })),
  rows: rows.map((row) => columns.map((column) => column.value(row))),
})

export const exportFilter = (label: string, value: string | undefined): TableExportFilter[] =>
  value === undefined || value === "" ? [] : [{ label, value }]

const DATE_FILTER_MESSAGE_KEYS = {
  [DATE_COLUMN_FILTER_OPERATOR.AFTER]: "export.filters.dateAfter",
  [DATE_COLUMN_FILTER_OPERATOR.BEFORE]: "export.filters.dateBefore",
  [DATE_COLUMN_FILTER_OPERATOR.ON]: "export.filters.dateOn",
} as const

export const describeDateFilter = (
  filter: DateColumnFilterValue,
  formatDate: (isoDate: string) => string,
  t: ReturnType<typeof useTranslations<"components.datagrid">>,
): string | undefined => {
  if (filter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return filter.startDate === undefined || filter.endDate === undefined
      ? undefined
      : t("export.filters.dateBetween", { end: formatDate(filter.endDate), start: formatDate(filter.startDate) })
  }

  return filter.date === undefined ? undefined : t(DATE_FILTER_MESSAGE_KEYS[filter.operator], { date: formatDate(filter.date) })
}

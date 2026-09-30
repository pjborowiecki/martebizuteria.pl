import { type Column, type RowData, type Table } from "@tanstack/react-table"

import { useDataGridLayout } from "~/src/presentation/components/custom/datagrid/components/data-grid-layout-context"
import { getDataGridColumnLayoutWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export const useDataGridColumnMetrics = <TData extends RowData>(
  column: Column<DataGridFeatures, TData>,
  table: Table<DataGridFeatures, TData>,
) => {
  const { tableClientWidth, tableLayout, tableWidth } = useDataGridLayout()
  const columnSizing = table.atoms.columnSizing.get()

  return {
    pinLayout: { tableClientWidth, tableWidth },
    tableLayout,
    widthPx: getDataGridColumnLayoutWidth(column, columnSizing, tableLayout),
  }
}

import { type CSSProperties } from "react"

import { type Column, type RowData, type Table } from "@tanstack/react-table"

import { buildDataGridColumnWidthStyle } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import { type DataGridTableLayout } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridPinLayout, getDataGridPinOffset } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export const buildDataGridCellStyle = <TData extends RowData>(input: {
  readonly column: Column<DataGridFeatures, TData>
  readonly isPinned: false | "start" | "end"
  readonly layout?: DataGridTableLayout | undefined
  readonly persistenceKey: string
  readonly pinLayout: DataGridPinLayout
  readonly table: Table<DataGridFeatures, TData>
  readonly widthPx: number
}): CSSProperties => {
  const { column, isPinned, layout, persistenceKey, pinLayout, table, widthPx } = input
  const columnSizing = table.atoms.columnSizing.get()
  const pinOffset = getDataGridPinOffset({ column, columnSizing, isPinned, pinLayout, table, tableLayout: layout })
  const style: CSSProperties = buildDataGridColumnWidthStyle({ column, layout, persistenceKey, widthPx })

  if (isPinned === "start" && pinOffset !== undefined) {
    style.insetInlineStart = pinOffset
  } else if (isPinned === "end" && pinOffset !== undefined) {
    style.insetInlineEnd = pinOffset
  }

  return style
}

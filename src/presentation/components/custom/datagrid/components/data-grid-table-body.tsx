import { type JSX } from "react"

import { type Column, type Row, type RowData, type Table } from "@tanstack/react-table"

import { DataGridEmptyRow } from "~/src/presentation/components/custom/datagrid/components/data-grid-empty-row"
import { DataGridRow } from "~/src/presentation/components/custom/datagrid/components/data-grid-row"
import { DataGridSkeleton } from "~/src/presentation/components/custom/datagrid/components/data-grid-skeleton"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

interface DataGridTableBodyProps<TData extends RowData> {
  readonly columns: Column<DataGridFeatures, TData>[]
  readonly emptyMessage: string
  readonly isLoading: boolean
  readonly isPlaceholderBody: boolean
  readonly onRowClick?: ((row: TData) => void) | undefined
  readonly onRowPointerDown?: ((row: TData) => void) | undefined
  readonly persistenceKey: string
  readonly rowReorder: RowReorderApi | undefined
  readonly rows: Row<DataGridFeatures, TData>[]
  readonly skeletonRowCount: number
  readonly table: Table<DataGridFeatures, TData>
  readonly visibleColumnCount: number
}

export const DataGridTableBody = <TData extends RowData>({
  columns,
  emptyMessage,
  isLoading,
  isPlaceholderBody,
  onRowClick,
  onRowPointerDown,
  persistenceKey,
  rowReorder,
  rows,
  skeletonRowCount,
  table,
  visibleColumnCount,
}: DataGridTableBodyProps<TData>): JSX.Element | JSX.Element[] => {
  if (isLoading) {
    return (
      <DataGridSkeleton
        columns={columns}
        isPlaceholderBody={isPlaceholderBody}
        persistenceKey={persistenceKey}
        rowCount={skeletonRowCount}
        table={table}
      />
    )
  }

  if (rows.length === 0) {
    return <DataGridEmptyRow colSpan={visibleColumnCount} message={emptyMessage} />
  }

  return rows.map((row) => (
    <DataGridRow
      key={row.id}
      row={row}
      rowReorder={rowReorder}
      persistenceKey={persistenceKey}
      table={table}
      onRowClick={onRowClick}
      onRowPointerDown={onRowPointerDown}
    />
  ))
}

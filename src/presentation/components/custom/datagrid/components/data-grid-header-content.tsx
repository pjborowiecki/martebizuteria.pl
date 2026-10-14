import { type JSX, type ReactNode } from "react"

import { type Column, type Header, type RowData, flexRender } from "@tanstack/react-table"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export const renderDataGridHeaderLabel = <TData extends RowData>(
  header: Header<DataGridFeatures, TData>,
  column: Column<DataGridFeatures, TData>,
): ReactNode => {
  const definition = column.columnDef.header
  if (typeof definition === "string") {
    return <span className="truncate">{definition}</span>
  }

  return flexRender(definition, header.getContext())
}

interface DataGridHeaderCellContentOptions<TData extends RowData> {
  readonly column: Column<DataGridFeatures, TData>
  readonly header: Header<DataGridFeatures, TData>
  readonly labelNode: ReactNode
  readonly onSort: (event: unknown) => void
  readonly sortButtonClassName: string
  readonly sortIcon: JSX.Element
  readonly sortLabel: string
}

export const buildDataGridHeaderCellContent = <TData extends RowData>({
  column,
  header,
  labelNode,
  onSort,
  sortButtonClassName,
  sortIcon,
  sortLabel,
}: DataGridHeaderCellContentOptions<TData>): ReactNode => {
  if (header.isPlaceholder) {
    return undefined
  }

  if (!column.getCanSort()) {
    return labelNode
  }

  return (
    <button type="button" onClick={onSort} aria-label={sortLabel} className={sortButtonClassName}>
      {labelNode}
      {sortIcon}
    </button>
  )
}

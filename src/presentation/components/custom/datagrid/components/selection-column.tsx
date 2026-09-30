import { type JSX, useCallback } from "react"

import { type Row, type RowData, type Table, type createColumnHelper } from "@tanstack/react-table"
import { cn } from "cn"

import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const SELECT_COLUMN_SIZE = 40

export interface SelectionLabels {
  readonly all: string
  readonly row: string
}

const WHITE_CHECKBOX =
  "border-input bg-background data-[state=checked]:border-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground"

const SelectAllCheckbox = <TData extends RowData>({
  label,
  table,
}: Readonly<{ label: string; table: Table<DataGridFeatures, TData> }>): JSX.Element => {
  const allSelected = table.getIsAllPageRowsSelected()
  const someSelected = table.getIsSomePageRowsSelected()

  const handleChange = useCallback(
    (checked: boolean) => {
      table.toggleAllPageRowsSelected(checked)
    },
    [table],
  )

  return (
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected && !allSelected}
      onCheckedChange={handleChange}
      aria-label={label}
      className={cn(WHITE_CHECKBOX)}
    />
  )
}

const RowSelectCheckbox = <TData extends RowData>({
  label,
  row,
}: Readonly<{ label: string; row: Row<DataGridFeatures, TData> }>): JSX.Element => {
  const handleChange = useCallback(
    (checked: boolean) => {
      row.toggleSelected(checked)
    },
    [row],
  )

  return (
    <Checkbox
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onCheckedChange={handleChange}
      aria-label={label}
      className={cn(WHITE_CHECKBOX)}
    />
  )
}

export const selectionColumn = <TData extends RowData>(
  helper: ReturnType<typeof createColumnHelper<DataGridFeatures, TData>>,
  labels: SelectionLabels,
) =>
  helper.display({
    cell: ({ row }) => <RowSelectCheckbox row={row} label={labels.row} />,
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllCheckbox table={table} label={labels.all} />,
    id: "select",
    meta: { cellClassName: "pl-4", headClassName: "pl-4", preventRowClick: true, skeletonVariant: "checkbox" },
    ...fixedDataGridColumnWidth(SELECT_COLUMN_SIZE),
  })

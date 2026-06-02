import { type JSX, useCallback } from "react";

import { type createColumnHelper, type Row, type RowData, type Table } from "@tanstack/react-table";

import { cn } from "~/src/lib/utils";

import { Checkbox } from "~/src/components/shadcn/checkbox";

import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";

const SELECT_COLUMN_SIZE = 40;

export interface SelectionLabels {
  readonly all: string;
  readonly row: string;
}

// Keep selection checkboxes white in both states (the shadcn default fills with
// the near-black `primary`), with a dark tick so they stay legible on any row.
const WHITE_CHECKBOX =
  "border-input bg-background data-[state=checked]:border-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground";

function SelectAllCheckbox<TData extends RowData>({ label, table }: Readonly<{ label: string; table: Table<TData> }>): JSX.Element {
  const allSelected = table.getIsAllPageRowsSelected();
  const someSelected = table.getIsSomePageRowsSelected();

  const handleChange = useCallback(
    (checked: boolean) => {
      table.toggleAllPageRowsSelected(checked);
    },
    [table]
  );

  return (
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected && !allSelected}
      onCheckedChange={handleChange}
      aria-label={label}
      className={cn(WHITE_CHECKBOX)}
    />
  );
}

function RowSelectCheckbox<TData extends RowData>({ label, row }: Readonly<{ label: string; row: Row<TData> }>): JSX.Element {
  const handleChange = useCallback(
    (checked: boolean) => {
      row.toggleSelected(checked);
    },
    [row]
  );

  return (
    <Checkbox
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onCheckedChange={handleChange}
      aria-label={label}
      className={cn(WHITE_CHECKBOX)}
    />
  );
}

/**
 * Generic row-selection column (select-all header + per-row checkbox) built with
 * the page's own column helper so it unifies with the rest of the column list.
 */
export function selectionColumn<TData extends RowData>(helper: ReturnType<typeof createColumnHelper<TData>>, labels: SelectionLabels) {
  return helper.display({
    cell: ({ row }) => <RowSelectCheckbox row={row} label={labels.row} />,
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllCheckbox table={table} label={labels.all} />,
    id: "select",
    meta: { cellClassName: "pl-4", headClassName: "pl-4", preventRowClick: true, skeletonVariant: "checkbox" },
    ...fixedDataGridColumnWidth(SELECT_COLUMN_SIZE)
  });
}

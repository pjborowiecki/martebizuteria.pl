import type { Column, RowData, Table } from "@tanstack/react-table";

import { getDataGridLayoutColumns } from "~/src/components/custom/datagrid/lib/data-grid.utils";

/** Header-aligned leaf columns (recomputed when order, visibility, or pinning changes). */
export function useDataGridLayoutColumns<TData extends RowData>(table: Table<TData>): Column<TData>[] {
  return getDataGridLayoutColumns(table);
}

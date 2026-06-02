import type { Column, RowData, Table } from "@tanstack/react-table";

import { useDataGridLayout } from "~/src/components/custom/datagrid/components/data-grid-layout-context";
import { getDataGridColumnLayoutWidth } from "~/src/components/custom/datagrid/lib/data-grid-table-layout";

/** Resolved column width and pin layout for a datagrid cell. */
export function useDataGridColumnMetrics<TData extends RowData>(column: Column<TData>, table: Table<TData>) {
  const { tableClientWidth, tableLayout, tableWidth } = useDataGridLayout();
  const { columnSizing } = table.getState();

  return {
    pinLayout: { tableClientWidth, tableWidth },
    tableLayout,
    widthPx: getDataGridColumnLayoutWidth(column, columnSizing, tableLayout)
  };
}

import type { CSSProperties } from "react";

import type { Column, RowData, Table } from "@tanstack/react-table";

import { buildDataGridColumnWidthStyle } from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import type { DataGridTableLayout } from "~/src/components/custom/datagrid/lib/data-grid-table-layout";
import { getDataGridPinOffset, type DataGridPinLayout } from "~/src/components/custom/datagrid/lib/data-grid.utils";

export function buildDataGridCellStyle<TData extends RowData>(input: {
  readonly column: Column<TData>;
  readonly isPinned: false | "left" | "right";
  readonly layout?: DataGridTableLayout;
  readonly persistenceKey: string;
  readonly pinLayout: DataGridPinLayout;
  readonly table: Table<TData>;
  readonly widthPx: number;
}): CSSProperties {
  const { column, isPinned, layout, persistenceKey, pinLayout, table, widthPx } = input;
  const pinOffset = getDataGridPinOffset({ column, isPinned, layout: pinLayout, table });
  const style: CSSProperties = buildDataGridColumnWidthStyle({ column, layout, persistenceKey, widthPx });

  if (isPinned === "left" && pinOffset !== undefined) {
    style.left = pinOffset;
  } else if (isPinned === "right" && pinOffset !== undefined) {
    style.right = pinOffset;
  }

  return style;
}

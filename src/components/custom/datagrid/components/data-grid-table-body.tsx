import type { JSX } from "react";

import type { Column, Row, RowData, Table } from "@tanstack/react-table";

import { DataGridEmptyRow } from "~/src/components/custom/datagrid/components/data-grid-empty-row";
import { DataGridRow } from "~/src/components/custom/datagrid/components/data-grid-row";
import { DataGridSkeleton } from "~/src/components/custom/datagrid/components/data-grid-skeleton";
import type { RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";

const NO_ROWS = 0;

interface DataGridTableBodyProps<TData extends RowData> {
  readonly columns: Column<TData>[];
  readonly emptyMessage: string;
  readonly isLoading: boolean;
  readonly isPlaceholderBody: boolean;
  readonly onRowClick?: (row: TData) => void;
  readonly onRowPointerEnter?: (row: TData) => void;
  readonly persistenceKey: string;
  readonly rowReorder: RowReorderApi | undefined;
  readonly rows: Row<TData>[];
  readonly skeletonRowCount: number;
  readonly table: Table<TData>;
  readonly visibleColumnCount: number;
}

export function DataGridTableBody<TData extends RowData>({
  columns,
  emptyMessage,
  isLoading,
  isPlaceholderBody,
  onRowClick,
  onRowPointerEnter,
  persistenceKey,
  rowReorder,
  rows,
  skeletonRowCount,
  table,
  visibleColumnCount
}: DataGridTableBodyProps<TData>): JSX.Element | JSX.Element[] {
  if (isLoading) {
    return (
      <DataGridSkeleton
        columns={columns}
        isPlaceholderBody={isPlaceholderBody}
        persistenceKey={persistenceKey}
        rowCount={skeletonRowCount}
        table={table}
      />
    );
  }

  if (rows.length === NO_ROWS) {
    return <DataGridEmptyRow colSpan={visibleColumnCount} message={emptyMessage} />;
  }

  return rows.map((row) => (
    <DataGridRow
      key={row.id}
      row={row}
      rowReorder={rowReorder}
      persistenceKey={persistenceKey}
      table={table}
      onRowClick={onRowClick}
      onRowPointerEnter={onRowPointerEnter}
    />
  ));
}

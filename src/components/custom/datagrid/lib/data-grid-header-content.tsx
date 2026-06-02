import type { JSX, ReactNode } from "react";

import { flexRender, type Column, type Header, type RowData } from "@tanstack/react-table";

export function renderDataGridHeaderLabel<TData extends RowData>(header: Header<TData, unknown>, column: Column<TData>): ReactNode {
  return flexRender(column.columnDef.header, header.getContext());
}

interface DataGridHeaderCellContentOptions<TData extends RowData> {
  readonly column: Column<TData>;
  readonly header: Header<TData, unknown>;
  readonly labelNode: ReactNode;
  readonly onSort: (event: unknown) => void;
  readonly sortButtonClassName: string;
  readonly sortIcon: JSX.Element;
  readonly sortLabel: string;
}

export function buildDataGridHeaderCellContent<TData extends RowData>({
  column,
  header,
  labelNode,
  onSort,
  sortButtonClassName,
  sortIcon,
  sortLabel
}: DataGridHeaderCellContentOptions<TData>): ReactNode {
  if (header.isPlaceholder) {
    return undefined;
  }
  if (!column.getCanSort()) {
    return labelNode;
  }
  return (
    <button type="button" onClick={onSort} aria-label={sortLabel} className={sortButtonClassName}>
      {labelNode}
      {sortIcon}
    </button>
  );
}

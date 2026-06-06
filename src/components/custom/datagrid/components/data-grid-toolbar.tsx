import type { JSX, ReactNode } from "react";

import type { RowData, Table } from "@tanstack/react-table";

import { DataGridResetLayout } from "~/src/components/custom/datagrid/components/data-grid-reset-layout";
import { DataGridSearch } from "~/src/components/custom/datagrid/components/data-grid-search";
import { DataGridViewOptions } from "~/src/components/custom/datagrid/components/data-grid-view-options";

interface DataGridToolbarProps<TData extends RowData> {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly filters?: ReactNode;
  readonly hasPreferenceOverrides: boolean;
  readonly onResetPreferences: () => void;
  readonly searchPlaceholder: string;
  readonly table: Table<TData>;
}

/** Top toolbar: search, view, layout reset, then page tools on the left; primary actions on the right. Optional `filters` render on a second row. */
export function DataGridToolbar<TData extends RowData>({
  actions,
  children,
  filters,
  hasPreferenceOverrides,
  onResetPreferences,
  searchPlaceholder,
  table
}: DataGridToolbarProps<TData>): JSX.Element {
  return (
    <div className="flex shrink-0 flex-col border-b border-border/60 bg-transparent">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <DataGridSearch table={table} placeholder={searchPlaceholder} />
          <DataGridViewOptions table={table} />
          <DataGridResetLayout disabled={!hasPreferenceOverrides} onReset={onResetPreferences} />
          {children}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {filters !== undefined && <div className="flex flex-wrap items-center gap-2 px-4 pb-3">{filters}</div>}
    </div>
  );
}

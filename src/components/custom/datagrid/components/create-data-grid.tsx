import { createContext, type JSX, type ReactNode, useContext } from "react";

import type { RowData } from "@tanstack/react-table";

import { DataGridPagination } from "~/src/components/custom/datagrid/components/data-grid-pagination";
import { DataGridTable } from "~/src/components/custom/datagrid/components/data-grid-table";
import { DataGridToolbar } from "~/src/components/custom/datagrid/components/data-grid-toolbar";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";

export interface CreateDataGridOptions {
  /** localStorage namespace for column layout preferences. */
  readonly persistenceKey: string;
}

export interface DataGrid<TData extends RowData> {
  /** localStorage namespace for column layout preferences (from `createDataGrid` options). */
  readonly persistenceKey: string;
  /** Renders the `<table>` (header, body, skeleton, empty state). */
  readonly Body: () => JSX.Element;
  /** Bottom pagination bar. */
  readonly Pagination: () => JSX.Element;
  /** Supplies the grid context; wrap the toolbar/body/pagination in it. */
  readonly Provider: (props: Readonly<{ children: ReactNode; value: DataGridContextValue<TData> }>) => JSX.Element;
  /** Top toolbar; pass page-specific filters/bulk actions as children and a primary action via `actions`. */
  readonly Toolbar: (props: Readonly<{ actions?: ReactNode; children?: ReactNode }>) => JSX.Element;
  /** Typed hook for page-level pieces (filters, bulk actions) to read the grid. */
  readonly useDataGrid: () => DataGridContextValue<TData>;
}

/**
 * Creates a typed datagrid bound to `TData`. Each page calls this once to get a
 * `Provider`, a `useDataGrid()` hook, and the chrome components — all sharing one
 * context so nothing is prop-drilled. Generic and fully type-safe (no casts).
 */
export function createDataGrid<TData extends RowData>({ persistenceKey }: CreateDataGridOptions): DataGrid<TData> {
  const DataGridContext = createContext<DataGridContextValue<TData> | undefined>(undefined);

  function useDataGrid(): DataGridContextValue<TData> {
    const context = useContext(DataGridContext);
    if (context === undefined) {
      throw new Error("useDataGrid must be used within <DataGrid.Provider>");
    }
    return context;
  }

  function Provider({ children, value }: Readonly<{ children: ReactNode; value: DataGridContextValue<TData> }>): JSX.Element {
    const { Provider: ContextProvider } = DataGridContext;
    return <ContextProvider value={value}>{children}</ContextProvider>;
  }

  function Toolbar({ actions, children }: Readonly<{ actions?: ReactNode; children?: ReactNode }>): JSX.Element {
    const { hasPreferenceOverrides, resetPreferences, searchPlaceholder, table } = useDataGrid();
    return (
      <DataGridToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        hasPreferenceOverrides={hasPreferenceOverrides}
        onResetPreferences={resetPreferences}
        actions={actions}
      >
        {children}
      </DataGridToolbar>
    );
  }

  function Body(): JSX.Element {
    const { columnReorder, emptyMessage, isLoading, onRowClick, rowReorder, table } = useDataGrid();
    return (
      <DataGridTable
        table={table}
        columnReorder={columnReorder}
        rowReorder={rowReorder}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        persistenceKey={persistenceKey}
        onRowClick={onRowClick}
      />
    );
  }

  function Pagination(): JSX.Element {
    const { table } = useDataGrid();
    return <DataGridPagination table={table} />;
  }

  return { Body, Pagination, Provider, Toolbar, persistenceKey, useDataGrid };
}

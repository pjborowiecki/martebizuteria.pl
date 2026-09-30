import { type JSX, type ReactNode, createContext, useContext } from "react"

import { type RowData } from "@tanstack/react-table"

import { DataGridPagination } from "~/src/presentation/components/custom/datagrid/components/data-grid-pagination"
import { DataGridTable } from "~/src/presentation/components/custom/datagrid/components/data-grid-table"
import { DataGridToolbar } from "~/src/presentation/components/custom/datagrid/components/data-grid-toolbar"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

export interface CreateDataGridOptions {
  readonly persistenceKey: string
}

export interface DataGrid<TData extends RowData> {
  readonly persistenceKey: string
  readonly Body: () => JSX.Element
  readonly Pagination: () => JSX.Element
  readonly Provider: (props: Readonly<{ children: ReactNode; value: DataGridContextValue<TData> }>) => JSX.Element
  readonly Toolbar: (props: Readonly<{ actions?: ReactNode; children?: ReactNode; filters?: ReactNode }>) => JSX.Element
  readonly useDataGrid: () => DataGridContextValue<TData>
}

export const createDataGrid = <TData extends RowData>({ persistenceKey }: CreateDataGridOptions): DataGrid<TData> => {
  const DataGridContext = createContext<DataGridContextValue<TData> | undefined>(undefined)

  const useDataGrid = (): DataGridContextValue<TData> => {
    const context = useContext(DataGridContext)
    if (context === undefined) {
      throw new Error("useDataGrid must be used within <DataGrid.Provider>")
    }

    return context
  }

  const Provider = ({ children, value }: Readonly<{ children: ReactNode; value: DataGridContextValue<TData> }>): JSX.Element => {
    const { Provider: ContextProvider } = DataGridContext

    return <ContextProvider value={value}>{children}</ContextProvider>
  }

  const Toolbar = ({
    actions,
    children,
    filters,
  }: Readonly<{ actions?: ReactNode; children?: ReactNode; filters?: ReactNode }>): JSX.Element => {
    const { hasPreferenceOverrides, resetPreferences, searchPlaceholder, table } = useDataGrid()

    return (
      <DataGridToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        hasPreferenceOverrides={hasPreferenceOverrides}
        onResetPreferences={resetPreferences}
        actions={actions}
        filters={filters}
      >
        {children}
      </DataGridToolbar>
    )
  }

  const Body = (): JSX.Element => {
    const { columnReorder, isLoading, onRowClick, onRowPointerEnter, rowReorder, table } = useDataGrid()

    return (
      <DataGridTable
        table={table}
        columnReorder={columnReorder}
        rowReorder={rowReorder}
        isLoading={isLoading}
        persistenceKey={persistenceKey}
        onRowClick={onRowClick}
        onRowPointerEnter={onRowPointerEnter}
      />
    )
  }

  const Pagination = (): JSX.Element => {
    const { table } = useDataGrid()

    return <DataGridPagination table={table} />
  }

  return { Body, Pagination, Provider, Toolbar, persistenceKey, useDataGrid }
}

import { createContext, useContext } from "react";

import type { DataGridTableLayout } from "~/src/components/custom/datagrid/lib/data-grid-table-layout";

export interface DataGridLayoutContextValue {
  readonly tableClientWidth: number;
  readonly tableLayout: DataGridTableLayout | undefined;
  readonly tableWidth: number;
}

const DataGridLayoutContext = createContext<DataGridLayoutContextValue>({
  tableClientWidth: 0,
  tableLayout: undefined,
  tableWidth: 0
});

export function useDataGridLayout(): DataGridLayoutContextValue {
  return useContext(DataGridLayoutContext);
}

export const DataGridLayoutProvider = DataGridLayoutContext.Provider;

import { type JSX, type ReactNode } from "react"

import { type Table, type TableOptions, createColumnHelper, useTable } from "@tanstack/react-table"
import { vi } from "vite-plus/test"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export interface HarnessRow {
  readonly id: string
  readonly price: number
  readonly title: string
}

export type HarnessTable = Table<DataGridFeatures, HarnessRow>

export const HARNESS_ROWS: HarnessRow[] = [
  { id: "silver-ring", price: 200, title: "Silver ring" },
  { id: "gold-ring", price: 400, title: "Gold ring" },
  { id: "silver-chain", price: 100, title: "Silver chain" },
]

export const harnessColumnHelper = createColumnHelper<DataGridFeatures, HarnessRow>()

const helper = harnessColumnHelper

export const HARNESS_COLUMNS = helper.columns([
  helper.accessor("title", { header: "Title" }),
  helper.accessor("price", { enableHiding: false, header: "Price" }),
])

type HarnessOptions = Partial<Omit<TableOptions<DataGridFeatures, HarnessRow>, "columns" | "data" | "features">>

export const DataGridHarness = ({
  children,
  columns = HARNESS_COLUMNS,
  data = HARNESS_ROWS,
  options,
}: Readonly<{
  children: (table: HarnessTable) => ReactNode
  columns?: TableOptions<DataGridFeatures, HarnessRow>["columns"] | undefined
  data?: HarnessRow[] | undefined
  options?: HarnessOptions | undefined
}>): JSX.Element => {
  const table = useTable<DataGridFeatures, HarnessRow>({
    columns,
    data,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    ...options,
  })

  return <>{children(table)}</>
}

class ResizeObserverStub {
  disconnect(): void {
    return undefined
  }

  observe(): void {
    return undefined
  }

  unobserve(): void {
    return undefined
  }
}

export const stubResizeObserver = (): void => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
}

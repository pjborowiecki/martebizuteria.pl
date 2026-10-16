import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { type ColumnFiltersState, createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { useCollectionsExportSource } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-export-source"

type CollectionRow = ProductCollection["adminListItem"]

const columnHelper = createColumnHelper<DataGridFeatures, CollectionRow>()

const COLUMNS = columnHelper.columns([columnHelper.accessor("status", { filterFn: "equalsString", header: "Status", id: "status" })])

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (columnFilters: ColumnFiltersState) =>
  renderHook(
    () => {
      const table = useTable<DataGridFeatures, CollectionRow>({
        columns: COLUMNS,
        data: [],
        features: dataGridFeatures,
        getRowId: (row) => row.id,
        initialState: { columnFilters },
      })

      return useCollectionsExportSource(table)
    },
    { wrapper: Wrapper },
  ).result.current

afterEach(cleanup)

describe("useCollectionsExportSource", () => {
  it("exports the collections the grid holds under the page title", () => {
    expect(sourceFor([])).toStrictEqual({ filters: [], list: "collections", title: "Collections" })
  })

  it("describes the status the grid is filtered to", () => {
    expect(sourceFor([{ id: "status", value: "active" }]).filters).toStrictEqual([{ label: "Status", value: "Active" }])
  })
})

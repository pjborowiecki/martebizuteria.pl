import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { type ColumnFiltersState, createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { useCategoriesExportSource } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-export-source"

type CategoryRow = ProductCategory["adminListItem"]

const columnHelper = createColumnHelper<DataGridFeatures, CategoryRow>()

const COLUMNS = columnHelper.columns([columnHelper.accessor("status", { filterFn: "equalsString", header: "Status", id: "status" })])

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (columnFilters: ColumnFiltersState) =>
  renderHook(
    () => {
      const table = useTable<DataGridFeatures, CategoryRow>({
        columns: COLUMNS,
        data: [],
        features: dataGridFeatures,
        getRowId: (row) => row.id,
        initialState: { columnFilters },
      })

      return useCategoriesExportSource(table)
    },
    { wrapper: Wrapper },
  ).result.current

afterEach(cleanup)

describe("useCategoriesExportSource", () => {
  it("exports the categories the grid holds under the page title", () => {
    expect(sourceFor([])).toStrictEqual({ filters: [], list: "categories", title: "Categories" })
  })

  it("describes the status the grid is filtered to", () => {
    expect(sourceFor([{ id: "status", value: "draft" }]).filters).toStrictEqual([{ label: "Status", value: "Draft" }])
  })
})

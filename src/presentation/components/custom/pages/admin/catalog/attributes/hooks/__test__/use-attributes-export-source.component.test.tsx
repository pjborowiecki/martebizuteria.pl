import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { type ColumnFiltersState, createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { useAttributesExportSource } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-export-source"

type AttributeRow = ProductAttribute["adminListItem"]

const columnHelper = createColumnHelper<DataGridFeatures, AttributeRow>()

const COLUMNS = columnHelper.columns([columnHelper.accessor("type", { filterFn: "equalsString", header: "Type", id: "type" })])

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (columnFilters: ColumnFiltersState, statFilter?: ProductAttributeStatFilter) =>
  renderHook(
    () => {
      const table = useTable<DataGridFeatures, AttributeRow>({
        columns: COLUMNS,
        data: [],
        features: dataGridFeatures,
        getRowId: (row) => row.id,
        initialState: { columnFilters },
      })

      return useAttributesExportSource(table, statFilter)
    },
    { wrapper: Wrapper },
  ).result.current

afterEach(cleanup)

describe("useAttributesExportSource", () => {
  it("exports the attributes the grid holds under the page title", () => {
    expect(sourceFor([])).toStrictEqual({ filters: [], list: "attributes", title: "Attributes" })
  })

  it("describes the stat card and the type the grid is narrowed to", () => {
    expect(sourceFor([{ id: "type", value: "multiselect" }], "inUse").filters).toStrictEqual([
      { label: "Quick filter", value: "Used on products" },
      { label: "Type", value: "Multiple choice" },
    ])
  })

  it.each([
    ["unused", "Unused"],
    ["choice", "With choice lists"],
  ] as const)("names the %s card", (statFilter, label) => {
    expect(sourceFor([], statFilter).filters).toStrictEqual([{ label: "Quick filter", value: label }])
  })

  it("leaves out a type filter it does not recognise", () => {
    expect(sourceFor([{ id: "type", value: "colour" }]).filters).toStrictEqual([])
  })
})

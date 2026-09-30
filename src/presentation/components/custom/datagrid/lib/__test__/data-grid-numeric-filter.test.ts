import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import { NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import { matchesNumericColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-numeric-filter"
import { dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface OrderRow {
  readonly id: string
  readonly total: number | string | null
}

const features = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, OrderRow>()

const columns = columnHelper.columns([
  columnHelper.accessor("id", {}),
  columnHelper.accessor("total", { filterFn: matchesNumericColumnFilter }),
])

const data: OrderRow[] = [
  { id: "low", total: 100 },
  { id: "mid", total: 500 },
  { id: "high", total: 900 },
  { id: "textual", total: "500" },
  { id: "missing", total: null },
]

const filterIds = (filterValue: unknown): string[] => {
  const table = constructTable({ columns, data, features })
  table.getColumn("total")?.setFilterValue(filterValue)

  return table.getFilteredRowModel().rows.map((row) => row.original.id)
}

describe("matchesNumericColumnFilter", () => {
  it("keeps every row when the filter value is not a recognised filter", () => {
    expect(filterIds(undefined)).toHaveLength(data.length)
    expect(filterIds({ amountMinorUnits: 500, operator: "approx" })).toHaveLength(data.length)
  })

  it.each([
    [NUMERIC_COLUMN_FILTER_OPERATOR.EQ, ["mid"]],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GT, ["high"]],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GTE, ["mid", "high"]],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LT, ["low"]],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LTE, ["low", "mid"]],
  ])("applies %s against the boundary amount", (operator, expected) => {
    expect(filterIds({ amountMinorUnits: 500, operator })).toStrictEqual(expected)
  })

  it("includes both bounds of a between range", () => {
    expect(
      filterIds({ endAmountMinorUnits: 900, operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmountMinorUnits: 500 }),
    ).toStrictEqual(["mid", "high"])
  })

  it("normalises an inverted between range instead of matching nothing", () => {
    expect(
      filterIds({ endAmountMinorUnits: 500, operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmountMinorUnits: 900 }),
    ).toStrictEqual(["mid", "high"])
  })

  it("drops cells that are not finite numbers, including numeric strings", () => {
    const matched = filterIds({ amountMinorUnits: 500, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ })

    expect(matched).not.toContain("textual")
    expect(matched).not.toContain("missing")
  })
})

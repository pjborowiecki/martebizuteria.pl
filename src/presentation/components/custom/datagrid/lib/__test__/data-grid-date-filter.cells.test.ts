import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import { matchesDateColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface CellRow {
  readonly createdAt: unknown
  readonly id: string
}

const features = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, CellRow>()

const columns = columnHelper.columns([
  columnHelper.accessor("id", {}),
  columnHelper.accessor("createdAt", { filterFn: matchesDateColumnFilter }),
])

const ON_MARCH_5 = { date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON }

const keptIds = (rows: CellRow[]): string[] => {
  const table = constructTable({ columns, data: rows, features })
  table.getColumn("createdAt")?.setFilterValue(ON_MARCH_5)

  return table.getFilteredRowModel().rows.map((row) => row.original.id)
}

const IN_RANGE = new Date(2024, 2, 5, 12)

describe("matchesDateColumnFilter cell values", () => {
  it("keeps a row whose cell is a Date inside the selected day", () => {
    expect(keptIds([{ createdAt: IN_RANGE, id: "date" }])).toStrictEqual(["date"])
  })

  it("drops a row whose cell holds an invalid Date", () => {
    expect(keptIds([{ createdAt: new Date(Number.NaN), id: "invalid" }])).toStrictEqual([])
  })

  it("drops a row whose cell is undefined", () => {
    expect(keptIds([{ createdAt: undefined, id: "missing" }])).toStrictEqual([])
  })

  it("drops a row whose cell is null", () => {
    expect(keptIds([{ createdAt: null, id: "null" }])).toStrictEqual([])
  })

  it.each([
    ["a boolean", true],
    ["an object", { day: 5 }],
    ["an array", [2024, 3, 5]],
  ])("drops a row whose cell is %s", (_label, value) => {
    expect(keptIds([{ createdAt: value, id: "unusable" }])).toStrictEqual([])
  })

  it("drops a row whose cell is a number that is not a real timestamp", () => {
    expect(keptIds([{ createdAt: Number.NaN, id: "nan" }])).toStrictEqual([])
  })

  it("keeps an epoch millisecond cell inside the selected day", () => {
    expect(keptIds([{ createdAt: IN_RANGE.getTime(), id: "epoch" }])).toStrictEqual(["epoch"])
  })

  it("keeps only the usable cells when they are mixed together", () => {
    expect(
      keptIds([
        { createdAt: IN_RANGE, id: "date" },
        { createdAt: "nonsense", id: "garbage" },
        { createdAt: null, id: "null" },
        { createdAt: IN_RANGE.toISOString(), id: "iso" },
      ]),
    ).toStrictEqual(["date", "iso"])
  })
})

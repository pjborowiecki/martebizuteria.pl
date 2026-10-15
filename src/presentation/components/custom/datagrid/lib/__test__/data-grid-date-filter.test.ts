import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  formatDateFilterTriggerLabel,
  isDateFilterRangeValid,
  matchesDateColumnFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface OrderRow {
  readonly createdAt: Date | number | string | null
  readonly id: string
}

const features = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, OrderRow>()

const columns = columnHelper.columns([
  columnHelper.accessor("id", {}),
  columnHelper.accessor("createdAt", { filterFn: matchesDateColumnFilter }),
])

const data: OrderRow[] = [
  { createdAt: new Date("2024-03-04T22:59:00.000Z"), id: "before" },
  { createdAt: new Date("2024-03-04T23:00:00.000Z"), id: "dayStart" },
  { createdAt: new Date("2024-03-05T22:59:59.999Z"), id: "dayEnd" },
  { createdAt: new Date("2024-03-05T23:00:00.000Z"), id: "after" },
  { createdAt: null, id: "missing" },
]

const filterIds = (filterValue: unknown, rows: OrderRow[] = data): string[] => {
  const table = constructTable({ columns, data: rows, features })
  table.getColumn("createdAt")?.setFilterValue(filterValue)

  return table.getFilteredRowModel().rows.map((row) => row.original.id)
}

describe("matchesDateColumnFilter", () => {
  it("keeps every row when the filter value is not a recognised filter", () => {
    expect(filterIds(undefined)).toHaveLength(data.length)
    expect(filterIds({ operator: "sometime" })).toHaveLength(data.length)
  })

  it("reads the day on the Polish clock, so its first and last minutes belong to it whatever zone the browser is in", () => {
    expect(filterIds({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON })).toStrictEqual(["dayStart", "dayEnd"])
  })

  it("excludes the selected day itself for before", () => {
    expect(filterIds({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })).toStrictEqual(["before"])
  })

  it("excludes the selected day itself for after", () => {
    expect(filterIds({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER })).toStrictEqual(["after"])
  })

  it("spans both endpoints inclusively for between", () => {
    expect(filterIds({ endDate: "2024-03-06", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-05" })).toStrictEqual([
      "dayStart",
      "dayEnd",
      "after",
    ])
  })

  it("drops rows dated after the closing day of a between range", () => {
    const range = { endDate: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-04" }

    expect(filterIds(range)).toStrictEqual(["before", "dayStart", "dayEnd"])
  })

  it("spans all 25 hours of the day the clocks go back", () => {
    const rows: OrderRow[] = [
      { createdAt: new Date("2024-10-26T22:00:00.000Z"), id: "firstMinute" },
      { createdAt: new Date("2024-10-27T22:59:00.000Z"), id: "lastMinute" },
      { createdAt: new Date("2024-10-27T23:00:00.000Z"), id: "nextDay" },
    ]

    expect(filterIds({ date: "2024-10-27", operator: DATE_COLUMN_FILTER_OPERATOR.ON }, rows)).toStrictEqual(["firstMinute", "lastMinute"])
  })

  it("drops rows with no date rather than showing them under every filter", () => {
    expect(filterIds({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON })).not.toContain("missing")
  })

  it("reads ISO strings and epoch milliseconds from the cell as well as Date objects", () => {
    const mixed: OrderRow[] = [
      { createdAt: "2024-03-05T11:00:00.000Z", id: "iso" },
      { createdAt: Date.parse("2024-03-05T11:00:00.000Z"), id: "epoch" },
      { createdAt: "not a date", id: "garbage" },
    ]

    expect(filterIds({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON }, mixed)).toStrictEqual(["iso", "epoch"])
  })
})

describe("isDateFilterRangeValid", () => {
  it("accepts an ordered range and a single-day range", () => {
    expect(isDateFilterRangeValid("2024-03-05", "2024-03-09")).toBe(true)
    expect(isDateFilterRangeValid("2024-03-05", "2024-03-05")).toBe(true)
  })

  it("rejects an inverted range", () => {
    expect(isDateFilterRangeValid("2024-03-09", "2024-03-05")).toBe(false)
  })

  it("rejects endpoints that are not real calendar dates", () => {
    expect(isDateFilterRangeValid("2024-02-30", "2024-03-05")).toBe(false)
    expect(isDateFilterRangeValid("2024-03-05", "")).toBe(false)
  })
})

const formatIsoDateLabel = (isoDate: string): string => `[${isoDate}]`

describe("formatDateFilterTriggerLabel", () => {
  it("shows the idle label when nothing is filtered", () => {
    expect(formatDateFilterTriggerLabel({ activeFilter: undefined, formatIsoDateLabel, idleLabel: "Any date" })).toBe("Any date")
  })

  it("shows both endpoints of a range", () => {
    expect(
      formatDateFilterTriggerLabel({
        activeFilter: { endDate: "2024-03-09", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-05" },
        formatIsoDateLabel,
        idleLabel: "Any date",
      }),
    ).toBe("[2024-03-05] – [2024-03-09]")
  })

  it("prefixes a single date with its operator symbol", () => {
    expect(
      formatDateFilterTriggerLabel({
        activeFilter: { date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER },
        formatIsoDateLabel,
        idleLabel: "Any date",
      }),
    ).toBe("> [2024-03-05]")
  })

  it("falls back to the idle label for a half-built filter", () => {
    expect(
      formatDateFilterTriggerLabel({
        activeFilter: { operator: DATE_COLUMN_FILTER_OPERATOR.ON },
        formatIsoDateLabel,
        idleLabel: "Any date",
      }),
    ).toBe("Any date")
    expect(
      formatDateFilterTriggerLabel({
        activeFilter: { operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-05" },
        formatIsoDateLabel,
        idleLabel: "Any date",
      }),
    ).toBe("Any date")
  })

  it("falls back to the idle label for a range that has only its closing day", () => {
    expect(
      formatDateFilterTriggerLabel({
        activeFilter: { endDate: "2024-03-09", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN },
        formatIsoDateLabel,
        idleLabel: "Any date",
      }),
    ).toBe("Any date")
  })
})

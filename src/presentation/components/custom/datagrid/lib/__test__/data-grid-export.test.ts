import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import {
  buildDataGridExportDocument,
  describeDateFilter,
  exportFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"

const t = createTranslator({ locale: TEST_LOCALE, messages: TEST_MESSAGES, namespace: "components.datagrid" })

const formatDate = (isoDate: string): string => `[${isoDate}]`

interface ExportRow {
  readonly note?: string
  readonly title: string
}

describe("exportFilter", () => {
  it("lists a filter that holds a value", () => {
    expect(exportFilter("Status", "Active")).toStrictEqual([{ label: "Status", value: "Active" }])
  })

  it("leaves out a filter that is not set", () => {
    expect(exportFilter("Status", undefined)).toStrictEqual([])
    expect(exportFilter("Search", "")).toStrictEqual([])
  })
})

describe("describeDateFilter", () => {
  it.each([
    ["on", "on [2026-10-01]"],
    ["before", "before [2026-10-01]"],
    ["after", "after [2026-10-01]"],
  ] as const)("describes the %s condition in words", (operator, description) => {
    expect(describeDateFilter({ date: "2026-10-01", operator }, formatDate, t)).toBe(description)
  })

  it("describes a range by both its ends", () => {
    expect(describeDateFilter({ endDate: "2026-10-31", operator: "between", startDate: "2026-10-01" }, formatDate, t)).toBe(
      "from [2026-10-01] to [2026-10-31]",
    )
  })

  it("describes nothing for a condition without its date", () => {
    expect(describeDateFilter({ operator: "on" }, formatDate, t)).toBeUndefined()
  })

  it("describes nothing for a range missing an end", () => {
    expect(describeDateFilter({ operator: "between", startDate: "2026-10-01" }, formatDate, t)).toBeUndefined()
    expect(describeDateFilter({ endDate: "2026-10-31", operator: "between" }, formatDate, t)).toBeUndefined()
  })
})

describe("buildDataGridExportDocument", () => {
  it("keeps the column ids and labels and reads each row through its columns", () => {
    const exportedAt = new Date("2026-10-16T12:34:56.000Z")

    expect(
      buildDataGridExportDocument({
        columns: [
          { id: "title", label: "Title", value: (row: ExportRow) => row.title },
          { id: "note", label: "Note", value: (row: ExportRow) => row.note },
        ],
        exportedAt,
        filters: [],
        formatLocale: "pl-PL",
        list: "products",
        rows: [{ title: "Silver ring" }],
        timeZone: "Europe/Warsaw",
        title: "Products",
      }),
    ).toStrictEqual({
      columns: [
        { id: "title", label: "Title" },
        { id: "note", label: "Note" },
      ],
      exportedAt,
      filters: [],
      formatLocale: "pl-PL",
      list: "products",
      rows: [["Silver ring", undefined]],
      timeZone: "Europe/Warsaw",
      title: "Products",
    })
  })
})

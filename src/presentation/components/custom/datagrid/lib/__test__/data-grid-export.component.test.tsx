import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { getDataGridExportColumns } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"

import { DataGridHarness, type HarnessTable, harnessColumnHelper } from "../../components/__test__/data-grid-harness"

const COLUMNS = harnessColumnHelper.columns([
  harnessColumnHelper.accessor("title", { header: "Title", meta: { exportValue: (row) => row.title } }),
  harnessColumnHelper.accessor("price", { header: () => "Price", meta: { exportValue: (row) => String(row.price) } }),
  harnessColumnHelper.accessor("id", { header: "Search terms", meta: { exportValue: (row) => row.id, filterOnly: true } }),
])

const exportedColumns = (): { id: string; label: string }[] => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness columns={COLUMNS}>
      {(table) => {
        seen.table = table

        return <span />
      }}
    </DataGridHarness>,
  )

  return seen.table === undefined ? [] : getDataGridExportColumns(seen.table).map(({ id, label }) => ({ id, label }))
}

afterEach(cleanup)

describe("getDataGridExportColumns", () => {
  it("labels a column without a plain text header by its id and skips columns that only filter", () => {
    expect(exportedColumns()).toStrictEqual([
      { id: "title", label: "Title" },
      { id: "price", label: "price" },
    ])
  })
})

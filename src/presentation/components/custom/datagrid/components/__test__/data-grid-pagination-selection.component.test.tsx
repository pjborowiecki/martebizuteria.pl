import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

import { DataGridPagination } from "~/src/presentation/components/custom/datagrid/components/data-grid-pagination"

import { DataGridHarness, type HarnessTable } from "./data-grid-harness"

vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange }: Readonly<{ onValueChange: (value: string | null) => void }>): JSX.Element => (
    <>
      {[null, "invalid", "20", "-10", "0"].map((value) => (
        <button
          key={String(value)}
          type="button"
          onClick={() => {
            onValueChange(value)
          }}
        >
          Select {String(value)}
        </button>
      ))}
    </>
  ),
}))

afterEach(cleanup)

describe("pagination selection boundary", () => {
  it.each(["null", "invalid", "20", "-10", "0"])("preserves the current page and size for %s", (value) => {
    const seen: { table?: HarnessTable } = {}
    renderWithProviders(
      <DataGridHarness options={{ initialState: { pagination: { pageIndex: 2, pageSize: 10 } }, manualPagination: true, rowCount: 100 }}>
        {(table) => {
          seen.table = table

          return <DataGridPagination table={table} />
        }}
      </DataGridHarness>,
    )

    fireEvent.click(screen.getByRole("button", { name: `Select ${value}` }))

    expect(seen.table?.atoms.pagination.get()).toStrictEqual({ pageIndex: 2, pageSize: 10 })
    expect(screen.getByText("21–30 of 100")).toBeInTheDocument()
  })
})

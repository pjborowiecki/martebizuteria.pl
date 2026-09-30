import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridSearch } from "~/src/presentation/components/custom/datagrid/components/data-grid-search"

import { DataGridHarness, type HarnessTable } from "./data-grid-harness"

const renderSearch = (placeholder = "Search products") => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness>
      {(table) => {
        seen.table = table

        return <DataGridSearch placeholder={placeholder} table={table} />
      }}
    </DataGridHarness>,
  )

  return seen
}

describe("DataGridSearch", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the input with the placeholder it is given", () => {
    renderSearch()

    expect(screen.getByRole("searchbox", { name: "Search products" })).toHaveAttribute("placeholder", "Search products")
  })

  it("starts empty when the table carries no global filter", () => {
    renderSearch()

    expect(screen.getByRole("searchbox")).toHaveValue("")
  })

  it("pushes what the shopper types into the table global filter", async () => {
    const seen = renderSearch()

    await userEvent.type(screen.getByRole("searchbox"), "silver")

    expect(seen.table?.atoms.globalFilter.get()).toBe("silver")
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["silver-ring", "silver-chain"])
  })

  it("reflects the filter back into the input value", async () => {
    renderSearch()
    const input = screen.getByRole("searchbox")

    await userEvent.type(input, "gold")

    expect(input).toHaveValue("gold")
  })
})

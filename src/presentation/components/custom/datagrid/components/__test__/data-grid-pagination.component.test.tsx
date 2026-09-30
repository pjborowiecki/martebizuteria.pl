import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridPagination } from "~/src/presentation/components/custom/datagrid/components/data-grid-pagination"

import { DataGridHarness, type HarnessRow, type HarnessTable } from "./data-grid-harness"

const manyRows = (count: number): HarnessRow[] =>
  Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, price: index * 100, title: `Row ${index}` }))

const renderPagination = (rows: HarnessRow[], manual?: { readonly rowCount: number }) => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness data={rows} options={manual === undefined ? {} : { manualPagination: true, rowCount: manual.rowCount }}>
      {(table) => {
        seen.table = table

        return <DataGridPagination table={table} />
      }}
    </DataGridHarness>,
  )

  return seen
}

const pickPageSize = async (label: string) => {
  await userEvent.click(screen.getByRole("combobox"))
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`the page size ${label} was not offered`)
  }

  await userEvent.click(target)
}

describe("DataGridPagination", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the first client page window and the page count", () => {
    renderPagination(manyRows(25))

    expect(screen.getByText("Rows per page")).toBeInTheDocument()
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })

  it("disables the backward controls on the first page", () => {
    renderPagination(manyRows(25))

    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
  })

  it("advances the window one page at a time", async () => {
    renderPagination(manyRows(25))

    await userEvent.click(screen.getByRole("button", { name: "Next page" }))

    expect(screen.getByText("11–20 of 25")).toBeInTheDocument()
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument()
  })

  it("jumps to the final partial page and disables the forward controls there", async () => {
    renderPagination(manyRows(25))

    await userEvent.click(screen.getByRole("button", { name: "Last page" }))

    expect(screen.getByText("21–25 of 25")).toBeInTheDocument()
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled()
  })

  it("returns to the first page from the last one", async () => {
    renderPagination(manyRows(25))

    await userEvent.click(screen.getByRole("button", { name: "Last page" }))
    await userEvent.click(screen.getByRole("button", { name: "First page" }))

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })

  it("steps back one page at a time", async () => {
    renderPagination(manyRows(25))

    await userEvent.click(screen.getByRole("button", { name: "Last page" }))
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }))

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument()
  })

  it("reports an empty grid as a single page showing nothing", () => {
    renderPagination([])

    expect(screen.getByText("0–0 of 0")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument()
  })

  it("counts server reported rows when pagination is manual", () => {
    renderPagination(manyRows(10), { rowCount: 57 })

    expect(screen.getByText("1–10 of 57")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument()
  })

  it("offers the shared page size options", () => {
    renderPagination(manyRows(25))

    expect(screen.getByRole("combobox")).toHaveTextContent("10")
  })

  it("lists every page size the grid supports", async () => {
    renderPagination(manyRows(25))

    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["10", "25", "50", "100", "250"])
  })

  it("widens the window when a larger page size is chosen", async () => {
    const seen = renderPagination(manyRows(25))

    await pickPageSize("25")

    expect(seen.table?.atoms.pagination.get().pageSize).toBe(25)
    expect(screen.getByText("1\u201325 of 25")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument()
  })

  it("counts nothing when manual pagination has not reported a row count yet", () => {
    const seen: { table?: HarnessTable } = {}

    renderWithProviders(
      <DataGridHarness data={manyRows(10)} options={{ manualPagination: true }}>
        {(table) => {
          seen.table = table

          return <DataGridPagination table={table} />
        }}
      </DataGridHarness>,
    )

    expect(screen.getByText("0\u20130 of 0")).toBeInTheDocument()
  })

  it("snaps a page size that is not an offered option up to the next one", () => {
    const seen: { table?: HarnessTable } = {}

    renderWithProviders(
      <DataGridHarness data={manyRows(25)} options={{ initialState: { pagination: { pageIndex: 0, pageSize: 7 } } }}>
        {(table) => {
          seen.table = table

          return <DataGridPagination table={table} />
        }}
      </DataGridHarness>,
    )

    expect(seen.table?.atoms.pagination.get().pageSize).toBe(10)
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument()
  })
})

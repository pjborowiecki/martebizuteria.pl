import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PAGES } from "~/src/data/content"

import { ContentListTable } from "~/src/presentation/components/custom/pages/admin/content/content-list-table"

const publishedCount = PAGES.filter((page) => page.status === "published").length

const draftCount = PAGES.filter((page) => page.status === "draft").length

describe("ContentListTable", () => {
  afterEach(cleanup)

  it("labels every translated column header", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toStrictEqual([
      "",
      "Title",
      "Path",
      "Sections",
      "Last Edited",
      "Status",
      "",
    ])
  })

  it("renders one body row per page", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getAllByLabelText("Select row")).toHaveLength(PAGES.length)
  })

  it("offers a single select-all checkbox in the header", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getByLabelText("Select all rows")).toBeInTheDocument()
  })

  it("renders a page title, path and section count together", () => {
    renderWithProviders(<ContentListTable />)

    const cells = screen.getByText("Nova Collection").closest("tr")?.querySelectorAll("td")

    expect([...(cells ?? [])].map((cell) => cell.textContent)).toStrictEqual([
      "",
      "Nova Collection",
      "/collections/nova",
      "4",
      "Oct 18, 2023",
      "Published",
      "",
    ])
  })

  it("translates the published status for every published page", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getAllByText("Published")).toHaveLength(publishedCount)
  })

  it("translates the draft status for the unpublished page", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getAllByText("Draft")).toHaveLength(draftCount)
    expect(screen.getByText("Holiday Lookbook").closest("tr")?.textContent).toContain("Draft")
  })

  it("keeps the previous page control disabled on the first page", () => {
    renderWithProviders(<ContentListTable />)

    const [previous, next] = screen.getAllByRole("button").filter((button) => button.textContent !== "")

    expect(previous).toBeDisabled()
    expect(next).not.toBeDisabled()
  })

  it("exposes a search input for pages", () => {
    renderWithProviders(<ContentListTable />)

    expect(screen.getByLabelText("Search pages")).toHaveAttribute("placeholder", "Search pages...")
  })
})

const cellsOfFirstRow = (): HTMLTableCellElement[] => {
  const [, firstBodyRow] = screen.getAllByRole("row")
  if (firstBodyRow === undefined) {
    throw new Error("the content table rendered no page row")
  }

  return [...firstBodyRow.querySelectorAll("td")]
}

const documentClicks = vi.fn<(event: Event) => void>()

describe("ContentListTable row actions", () => {
  afterEach(() => {
    cleanup()
    document.body.removeEventListener("click", documentClicks)
    documentClicks.mockReset()
  })

  it("keeps a click on the actions cell from reaching the page around the table", () => {
    renderWithProviders(<ContentListTable />)
    document.body.addEventListener("click", documentClicks)

    fireEvent.click(cellsOfFirstRow().at(-1) ?? document.body)

    expect(documentClicks).not.toHaveBeenCalled()
  })

  it("lets a click on the rest of the row through", () => {
    renderWithProviders(<ContentListTable />)
    document.body.addEventListener("click", documentClicks)
    const [, titleCell] = cellsOfFirstRow()

    fireEvent.click(titleCell ?? document.body)

    expect(documentClicks).toHaveBeenCalledOnce()
  })
})

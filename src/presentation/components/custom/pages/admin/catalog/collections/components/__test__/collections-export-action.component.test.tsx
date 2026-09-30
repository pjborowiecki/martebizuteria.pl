import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionsExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-export-action"

import { CollectionsGridHarness, type CollectionsTable, collectionRow } from "./collections-grid-harness"

const ROWS = [
  collectionRow({
    descriptions: { "en-US": 'The "new" season', "pl-PL": "Nowy sezon" },
    handle: "new-arrivals",
    id: "collection-1",
    productCount: 4,
    status: "active",
    titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" },
  }),
  collectionRow({
    descriptions: null,
    handle: "sale",
    id: "collection-2",
    productCount: 0,
    status: "draft",
    titles: { "en-US": "Sale", "pl-PL": "Wyprzedaz" },
  }),
]

const download = vi.hoisted(() => ({ csv: vi.fn<(fileName: string, content: string) => void>() }))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, downloadCsvFile: download.csv }
})

const renderExportAction = () => {
  const seen: { table?: CollectionsTable } = {}

  renderWithProviders(
    <CollectionsGridHarness rows={ROWS}>
      {(table) => {
        seen.table = table

        return <CollectionsExportAction />
      }}
    </CollectionsGridHarness>,
  )

  return seen
}

const exportedLines = () => (download.csv.mock.calls[0]?.[1] ?? "").split("\n")

describe("CollectionsExportAction", () => {
  beforeEach(() => {
    download.csv.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("offers a labelled export button", () => {
    renderExportAction()

    expect(screen.getByRole("button", { name: "Download table as CSV" })).toBeInTheDocument()
  })

  it("writes a file named after the table", async () => {
    renderExportAction()

    await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))

    expect(download.csv.mock.calls[0]?.[0]).toBe("collections.csv")
  })

  it("heads the file with one title column per supported locale", async () => {
    renderExportAction()

    await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))

    expect(exportedLines()[0]).toBe("ID,Name PL-PL,Name EN-US,Handle,Status,Products,Description")
  })

  it("writes one row per collection with its titles, status and product count", async () => {
    renderExportAction()

    await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))

    expect(exportedLines()[2]).toBe('collection-2,"Wyprzedaz","Sale",sale,draft,0,""')
  })

  it("escapes quotes inside the localized description", async () => {
    renderExportAction()

    await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))

    expect(exportedLines()[1]).toBe('collection-1,"Nowosci","New arrivals",new-arrivals,active,4,"The ""new"" season"')
  })

  it("exports only the rows that survive the current filter", async () => {
    const seen = renderExportAction()
    seen.table?.getColumn("status")?.setFilterValue("draft")

    await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))

    const lines = exportedLines()
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("collection-2")
  })
})

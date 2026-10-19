import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type TextFileDownload } from "~/src/presentation/components/custom/datagrid/lib/download"

const { download, toastError } = vi.hoisted(() => ({
  download: vi.fn<(file: TextFileDownload) => void>(),
  toastError: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/datagrid/lib/download", () => ({ downloadTextFile: download }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

import { DataGridExport } from "~/src/presentation/components/custom/datagrid/components/data-grid-export"
import { type DataGridExportSource } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"

import { DataGridHarness, HARNESS_ROWS, type HarnessRow, type HarnessTable, harnessColumnHelper } from "./data-grid-harness"

const EXPORT_COLUMNS = harnessColumnHelper.columns([
  harnessColumnHelper.accessor("title", { header: "Title", meta: { exportValue: (row) => row.title } }),
  harnessColumnHelper.accessor("price", { header: "Price", meta: { exportValue: (row) => `${String(row.price)} zł` } }),
  harnessColumnHelper.display({ cell: () => "row actions", header: () => <span>Actions</span>, id: "actions" }),
])

const BOM = "\uFEFF"

const CLIENT_SOURCE: DataGridExportSource<HarnessRow> = { filters: [], list: "products", title: "Products" }

const renderExport = (
  source: DataGridExportSource<HarnessRow> = CLIENT_SOURCE,
  options: Parameters<typeof DataGridHarness>[0]["options"] = {},
) => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness columns={EXPORT_COLUMNS} options={options}>
      {(table) => {
        seen.table = table

        return <DataGridExport source={source} table={table} />
      }}
    </DataGridHarness>,
  )

  return seen
}

const exportAs = async (format: RegExp): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name: "Export" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: format }))
}

const downloaded = async (): Promise<TextFileDownload | undefined> => {
  await waitFor(() => {
    expect(download).toHaveBeenCalledTimes(1)
  })

  return download.mock.lastCall?.[0]
}

const downloadedContent = async (): Promise<string | undefined> => {
  const file = await downloaded()

  return file?.content
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: new Date("2026-10-16T12:34:56.000Z"), toFake: ["Date"] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("DataGridExport menu", () => {
  it("labels its trigger as the export", () => {
    renderExport()

    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled()
  })

  it("offers CSV, JSON, XML and TXT with what each format is for", async () => {
    renderExport()

    await userEvent.click(screen.getByRole("button", { name: "Export" }))

    expect(await screen.findByText("Export as")).toBeInTheDocument()
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual([
      "CSVFor Excel, Numbers and Google Sheets",
      "JSONStructured data for programs and AI assistants",
      "XMLFor systems that import XML",
      "TXTPlain text to read or paste into an AI chat",
    ])
  })
})

describe("DataGridExport columns", () => {
  it("writes the visible columns with their headers and leaves out the row actions", async () => {
    renderExport()

    await exportAs(/^CSV/u)

    expect(await downloaded()).toStrictEqual({
      content: `${BOM}Title,Price\r\nSilver ring,200 zł\r\nGold ring,400 zł\r\nSilver chain,100 zł\r\n`,
      fileName: "products-2026-10-16-1434.csv",
      mimeType: "text/csv;charset=utf-8",
    })
  })

  it("leaves out a column the admin hid", async () => {
    const seen = renderExport()
    act(() => {
      seen.table?.setColumnVisibility({ title: false })
    })

    await exportAs(/^CSV/u)

    expect(await downloadedContent()).toBe(`${BOM}Price\r\n200 zł\r\n400 zł\r\n100 zł\r\n`)
  })

  it("follows the order the admin dragged the columns into", async () => {
    const seen = renderExport()
    act(() => {
      seen.table?.setColumnOrder(["price", "title", "actions"])
    })

    await exportAs(/^CSV/u)

    expect(await downloadedContent()).toMatch(/^\uFEFFPrice,Title\r\n200 zł,Silver ring\r\n/u)
  })

  it("puts pinned columns where the grid shows them", async () => {
    renderExport(CLIENT_SOURCE, { initialState: { columnPinning: { end: ["title"], start: [] } } })

    await exportAs(/^CSV/u)

    expect(await downloadedContent()).toMatch(/^\uFEFFPrice,Title\r\n/u)
  })
})

describe("DataGridExport rows", () => {
  it("exports every row a client-side grid shows, filtered and sorted, across all its pages", async () => {
    const seen = renderExport(CLIENT_SOURCE, { initialState: { pagination: { pageIndex: 0, pageSize: 1 } } })
    act(() => {
      seen.table?.setGlobalFilter("silver")
      seen.table?.setSorting([{ desc: true, id: "price" }])
    })

    await exportAs(/^CSV/u)

    expect(await downloadedContent()).toBe(`${BOM}Title,Price\r\nSilver ring,200 zł\r\nSilver chain,100 zł\r\n`)
  })

  it("exports the rows the list loads for its server-side filters instead of the page on screen", async () => {
    const loadRows = vi.fn(() => Promise.resolve([{ id: "pearl", price: 900, title: "Pearl earrings" }]))
    renderExport({ ...CLIENT_SOURCE, loadRows })

    await exportAs(/^CSV/u)

    expect(await downloadedContent()).toBe(`${BOM}Title,Price\r\nPearl earrings,900 zł\r\n`)
    expect(loadRows).toHaveBeenCalledTimes(1)
  })

  it("names the search the server rows were loaded with rather than what the search box holds while it settles", async () => {
    const seen = renderExport({ ...CLIENT_SOURCE, loadRows: () => Promise.resolve([]), search: "pearl" })
    act(() => {
      seen.table?.setGlobalFilter("pearl ear")
    })

    await exportAs(/^JSON/u)

    expect(await downloadedContent()).toContain(
      '"filters": [\n      {\n        "label": "Search",\n        "value": "pearl"\n      }\n    ]',
    )
  })
})

describe("DataGridExport metadata", () => {
  it("describes the list, its filters, the search and the columns in the JSON", async () => {
    const seen = renderExport({ ...CLIENT_SOURCE, filters: [{ label: "Status", value: "Active" }] })
    act(() => {
      seen.table?.setGlobalFilter(" ring")
    })

    await exportAs(/^JSON/u)
    const file = await downloaded()

    expect(file).toMatchObject({ fileName: "products-2026-10-16-1434.json", mimeType: "application/json;charset=utf-8" })
    expect(JSON.parse(file?.content ?? "")).toStrictEqual({
      metadata: {
        columns: [
          { id: "title", label: "Title" },
          { id: "price", label: "Price" },
        ],
        exportedAt: "2026-10-16T12:34:56.000Z",
        filters: [
          { label: "Status", value: "Active" },
          { label: "Search", value: "ring" },
        ],
        list: "products",
        rowCount: 2,
        timeZone: "Europe/Warsaw",
        title: "Products",
      },
      rows: [
        { price: "200 zł", title: "Silver ring" },
        { price: "400 zł", title: "Gold ring" },
      ],
    })
  })

  it("writes the plain text header in the page language and the admin's time zone", async () => {
    renderExport()

    await exportAs(/^TXT/u)
    const file = await downloaded()

    expect(file).toMatchObject({ fileName: "products-2026-10-16-1434.txt", mimeType: "text/plain;charset=utf-8" })
    expect(file?.content).toMatch(
      /^Products\nExported: 2026-10-16 14:34 \(Europe\/Warsaw\)\nRows: 3\nFilters: none\n\nTitle: Silver ring\n/u,
    )
  })

  it("writes the XML as an XML file", async () => {
    renderExport()

    await exportAs(/^XML/u)

    expect(await downloaded()).toMatchObject({ fileName: "products-2026-10-16-1434.xml", mimeType: "application/xml;charset=utf-8" })
  })
})

describe("DataGridExport progress", () => {
  it("disables the trigger until the rows have loaded", async () => {
    const pending: { resolve?: (rows: HarnessRow[]) => void } = {}
    const loadRows = () =>
      new Promise<HarnessRow[]>((resolve) => {
        pending.resolve = resolve
      })
    renderExport({ ...CLIENT_SOURCE, loadRows })

    await exportAs(/^CSV/u)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export" })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute("aria-busy", "true")

    act(() => {
      pending.resolve?.([...HARNESS_ROWS])
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled()
    })
    expect(download).toHaveBeenCalledTimes(1)
  })

  it("tells the admin when the rows could not be loaded and downloads nothing", async () => {
    renderExport({ ...CLIENT_SOURCE, loadRows: () => Promise.reject(new Error("FORBIDDEN")) })

    await exportAs(/^CSV/u)

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledTimes(1)
    })
    expect(toastError.mock.lastCall?.[0]).toBe("The table could not be exported")
    expect(toastError.mock.lastCall?.[1].description).not.toBe("")
    expect(download).not.toHaveBeenCalled()
  })
})

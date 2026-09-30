import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface ExportRow {
  readonly handle: string
  readonly id: string
  readonly productCount: number
  readonly titles: Record<string, string>
  readonly type: string
  readonly unit: string | null
}

const grid = vi.hoisted(() => ({ rows: [] as { original: ExportRow }[] }))

const csv = vi.hoisted(() => ({ download: vi.fn<(fileName: string, content: string) => void>() }))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, downloadCsvFile: csv.download }
})
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid", () => ({
  attributesDataGrid: {
    useDataGrid: () => ({ table: { getFilteredRowModel: () => ({ rows: grid.rows }) } }),
  },
}))

import { AttributesExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-export-action"

const row = (overrides: Partial<ExportRow> = {}): { original: ExportRow } => ({
  original: {
    handle: "material",
    id: "attribute-1",
    productCount: 12,
    titles: { "en-US": "Material", "pl-PL": "Materiał" },
    type: "select",
    unit: "g",
    ...overrides,
  },
})

const downloadedCsv = (): string => {
  const [call] = csv.download.mock.calls

  if (call === undefined) {
    throw new Error("No CSV was downloaded")
  }

  return call[1]
}

const clickExport = async (): Promise<void> => {
  renderWithProviders(<AttributesExportAction />)
  await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.rows = [row()]
})

describe("AttributesExportAction", () => {
  it("names the downloaded file after the table", async () => {
    await clickExport()

    expect(csv.download.mock.calls[0]?.[0]).toBe("attributes.csv")
  })

  it("writes a header row with one title column per locale", async () => {
    await clickExport()

    expect(downloadedCsv().split("\n")[0]).toBe("ID,Title PL-PL,Title EN-US,Handle,Type,Unit,Products")
  })

  it("writes one row per filtered attribute", async () => {
    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toBe('attribute-1,"Materiał","Material",material,select,"g",12')
  })

  it("writes an empty unit cell when the attribute has none", async () => {
    grid.rows = [row({ unit: null })]

    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toBe('attribute-1,"Materiał","Material",material,select,"",12')
  })

  it("escapes a quote inside a title", async () => {
    grid.rows = [row({ titles: { "en-US": 'The "Gold" Edit', "pl-PL": "Złoto" } })]

    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toContain('"The ""Gold"" Edit"')
  })

  it("writes only the header row when nothing matches the filters", async () => {
    grid.rows = []

    await clickExport()

    expect(downloadedCsv().split("\n")).toHaveLength(1)
  })
})

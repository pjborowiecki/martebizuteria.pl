import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

type LocaleMap = Record<string, string>

interface ExportRow {
  readonly descriptions: LocaleMap
  readonly handle: string
  readonly id: string
  readonly parentTitles: LocaleMap | undefined
  readonly productCount: number
  readonly shortDescriptions: LocaleMap
  readonly status: string
  readonly subtitles: LocaleMap
  readonly titles: LocaleMap
}

const grid = vi.hoisted(() => ({ rows: [] as { original: ExportRow }[] }))

const csv = vi.hoisted(() => ({ download: vi.fn<(fileName: string, content: string) => void>() }))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, downloadCsvFile: csv.download }
})
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    useDataGrid: () => ({ table: { getFilteredRowModel: () => ({ rows: grid.rows }) } }),
  },
}))

import { CategoriesExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-export-action"

const localized = (english: string, polish: string): LocaleMap => ({ "en-US": english, "pl-PL": polish })

const row = (overrides: Partial<ExportRow> = {}): { original: ExportRow } => ({
  original: {
    descriptions: localized("Rings cast in gold.", "Pierścienie ze złota."),
    handle: "rings",
    id: "category-1",
    parentTitles: localized("Jewelry", "Biżuteria"),
    productCount: 7,
    shortDescriptions: localized("Gold rings", "Złote pierścienie"),
    status: "active",
    subtitles: localized("Every ring", "Każdy pierścień"),
    titles: localized("Rings", "Pierścienie"),
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
  renderWithProviders(<CategoriesExportAction />)
  await userEvent.click(screen.getByRole("button", { name: "Download table as CSV" }))
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.rows = [row()]
})

describe("CategoriesExportAction", () => {
  it("names the downloaded file after the table", async () => {
    await clickExport()

    expect(csv.download.mock.calls[0]?.[0]).toBe("categories.csv")
  })

  it("writes a header row with one title column per locale", async () => {
    await clickExport()

    expect(downloadedCsv().split("\n")[0]).toBe(
      "ID,Title PL-PL,Title EN-US,Handle,Subtitle,Short description,Parent,Status,Products,Description",
    )
  })

  it("resolves the localized cells for the active locale", async () => {
    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toBe(
      'category-1,"Pierścienie","Rings",rings,"Every ring","Gold rings","Jewelry",active,7,"Rings cast in gold."',
    )
  })

  it("leaves the parent cell empty for a root category", async () => {
    grid.rows = [row({ parentTitles: undefined })]

    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toContain(',"",active,7,')
  })

  it("falls back to the default locale when the active locale has no value", async () => {
    grid.rows = [row({ subtitles: localized("", "Każdy pierścień") })]

    await clickExport()

    expect(downloadedCsv().split("\n")[1]).toContain('"Każdy pierścień"')
  })

  it("writes only the header row when nothing matches the filters", async () => {
    grid.rows = []

    await clickExport()

    expect(downloadedCsv().split("\n")).toHaveLength(1)
  })
})

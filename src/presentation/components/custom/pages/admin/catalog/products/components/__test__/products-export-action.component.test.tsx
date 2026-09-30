import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const productRow = {
  categoryTitles: "Rings",
  collectionTitles: "Silver 925",
  handle: "srebrny-pierscionek",
  id: "prod-1",
  minPrice: 12_000,
  skuSummary: "SKU-1",
  status: "published",
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  totalStock: 7,
  variantCount: 2,
}

const { clientRows, downloadCsvFile, exportAdminProducts, gridContext } = vi.hoisted(() => {
  const rows: { original: unknown }[] = []

  return {
    clientRows: rows,
    downloadCsvFile: vi.fn<(fileName: string, content: string) => void>(),
    exportAdminProducts: vi.fn(),
    gridContext: {
      exportListInput: { search: "ring" },
      hasServerListQuery: true,
      table: { getFilteredRowModel: () => ({ rows }) },
    },
  }
})

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => ({ ...(await importOriginal()), downloadCsvFile }))
vi.mock("~/src/modules/product/use-cases/export-admin-products", () => ({ exportAdminProducts }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => gridContext,
}))

import { ProductsExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-export-action"

const EXPORT_LABEL = "Download table as CSV"

const HEADER_ROW = "ID,Title,Handle,SKU,Status,Categories,Collections,Min price,Stock,Variants"

const writtenCsv = (): { content: string; fileName: string } => {
  const [fileName, content] = downloadCsvFile.mock.calls[0] ?? []
  if (fileName === undefined || content === undefined) {
    throw new Error("No CSV was written")
  }

  return { content, fileName }
}

const clickExport = (): void => {
  renderWithProviders(<ProductsExportAction />)
  fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))
}

beforeEach(() => {
  downloadCsvFile.mockReset()
  exportAdminProducts.mockReset()
  clientRows.length = 0
  gridContext.hasServerListQuery = true
})

afterEach(() => {
  cleanup()
})

describe("ProductsExportAction", () => {
  it("asks the server for the rows the current filters select", async () => {
    exportAdminProducts.mockResolvedValueOnce([])
    clickExport()

    await waitFor(() => {
      expect(exportAdminProducts).toHaveBeenCalledWith({ data: { search: "ring" } })
    })
  })

  it("writes only the header row for an empty export", async () => {
    exportAdminProducts.mockResolvedValueOnce([])
    clickExport()

    await waitFor(() => {
      expect(writtenCsv()).toStrictEqual({ content: HEADER_ROW, fileName: "products.csv" })
    })
  })

  it("writes the product row with its localized title", async () => {
    exportAdminProducts.mockResolvedValueOnce([productRow])
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().content.split("\n")[1]).toBe(
        'prod-1,"Silver ring",srebrny-pierscionek,"SKU-1",published,"Rings","Silver 925",12000,7,2',
      )
    })
  })

  it("leaves the optional columns empty when the row has no values for them", async () => {
    exportAdminProducts.mockResolvedValueOnce([
      { handle: "h", id: "prod-2", status: "draft", titles: { "en-US": "Plain", "pl-PL": "Zwykły" }, totalStock: 0, variantCount: 1 },
    ])
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().content.split("\n")[1]).toBe('prod-2,"Plain",h,"",draft,"","",,0,1')
    })
  })

  it("escapes the quotes inside a product title", async () => {
    exportAdminProducts.mockResolvedValueOnce([{ ...productRow, titles: { "en-US": 'The "Aurora" ring', "pl-PL": "Aurora" } }])
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().content).toContain('"The ""Aurora"" ring"')
    })
  })

  it("exports the filtered client rows when the list is not server driven", async () => {
    gridContext.hasServerListQuery = false
    clientRows.push({ original: productRow })
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().content).toContain("prod-1")
    })
    expect(exportAdminProducts).not.toHaveBeenCalled()
  })
})

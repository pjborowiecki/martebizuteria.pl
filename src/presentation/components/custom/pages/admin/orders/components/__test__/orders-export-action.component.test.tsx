import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { downloadCsvFile, exportAdminOrders, useOrdersDataGridContext } = vi.hoisted(() => ({
  downloadCsvFile: vi.fn<(fileName: string, content: string) => void>(),
  exportAdminOrders: vi.fn(),
  useOrdersDataGridContext: vi.fn(() => ({ exportListInput: { search: "anna" } })),
}))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => ({ ...(await importOriginal()), downloadCsvFile }))
vi.mock("~/src/modules/order/use-cases/export-admin-orders", () => ({ exportAdminOrders }))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid", () => ({ useOrdersDataGridContext }))

import { OrdersExportAction } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-export-action"

const EXPORT_LABEL = "Export"

const HEADER_ROW = "Order ID,Customer,Email,Date,Items,Total,Payment,Fulfillment,Status"

const orderRow = {
  createdAt: new Date("2026-03-14T10:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  fulfillmentUiKey: "shipped",
  id: "order-1",
  itemCount: 2,
  paymentUiKey: "paid",
  status: "completed",
  totalMinorUnits: 12_000,
}

const withPlainSpaces = (value: string): string => value.replaceAll(/\p{Zs}/gu, " ")

const writtenCsv = (): { content: string; fileName: string } => {
  const [fileName, content] = downloadCsvFile.mock.calls[0] ?? []
  if (fileName === undefined || content === undefined) {
    throw new Error("No CSV was written")
  }

  return { content, fileName }
}

beforeEach(() => {
  downloadCsvFile.mockReset()
  exportAdminOrders.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("OrdersExportAction", () => {
  it("offers an enabled export action", () => {
    renderWithProviders(<OrdersExportAction />)

    expect(screen.getByRole("button", { name: EXPORT_LABEL })).toBeEnabled()
  })

  it("exports the rows the current filters select", async () => {
    exportAdminOrders.mockResolvedValueOnce([])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(exportAdminOrders).toHaveBeenCalledWith({ data: { search: "anna" } })
    })
  })

  it("writes only the header row for an empty export", async () => {
    exportAdminOrders.mockResolvedValueOnce([])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(writtenCsv().content).toBe(HEADER_ROW)
    })
  })

  it("names the file after the day it was exported", async () => {
    exportAdminOrders.mockResolvedValueOnce([])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(writtenCsv().fileName).toMatch(/^orders-export-\d{4}-\d{2}-\d{2}\.csv$/u)
    })
  })

  it("writes the translated payment, fulfillment and status labels", async () => {
    exportAdminOrders.mockResolvedValueOnce([orderRow])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(withPlainSpaces(writtenCsv().content.split("\n")[1] ?? "")).toBe(
        '"order-1","Anna Kowalska","anna@example.com","Mar 14, 2026","2","PLN 120.00","Paid","Shipped","Completed"',
      )
    })
  })

  it("writes an unrecognised payment or fulfillment key verbatim", async () => {
    exportAdminOrders.mockResolvedValueOnce([{ ...orderRow, fulfillmentUiKey: "partially_shipped", paymentUiKey: "disputed" }])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(writtenCsv().content).toContain('"disputed","partially_shipped"')
    })
  })

  it("escapes the quotes inside a customer name", async () => {
    exportAdminOrders.mockResolvedValueOnce([{ ...orderRow, customerName: 'Anna "Ania" Kowalska' }])
    renderWithProviders(<OrdersExportAction />)
    fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))

    await waitFor(() => {
      expect(writtenCsv().content).toContain('"Anna ""Ania"" Kowalska"')
    })
  })
})

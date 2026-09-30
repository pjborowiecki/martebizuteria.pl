import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { downloadCsvFile, exportAdminCustomers, useCustomersDataGridContext } = vi.hoisted(() => ({
  downloadCsvFile: vi.fn<(fileName: string, content: string) => void>(),
  exportAdminCustomers: vi.fn(),
  useCustomersDataGridContext: vi.fn(() => ({ exportListInput: { search: "anna" } })),
}))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => ({ ...(await importOriginal()), downloadCsvFile }))
vi.mock("~/src/modules/user/use-cases/export-admin-customers", () => ({ exportAdminCustomers }))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid", () => ({
  useCustomersDataGridContext,
}))

import { CustomersExportAction } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-export-action"

const EXPORT_LABEL = "Download table as CSV"

const HEADER_ROW =
  "ID,Stripe Customer ID,Name,Email,Role,Phone,Email Verified,Banned,Location,Orders,Total Spent,Average Order Value,Last Order,Account Created"

const customerRow = {
  averageOrderValue: 6000,
  city: "Warszawa",
  countryCode: "PL",
  createdAt: new Date("2026-03-14T10:00:00.000Z"),
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  name: "Anna Kowalska",
  orderCount: 2,
  province: "Mazowieckie",
  role: "customer",
  totalSpent: 12_000,
}

const withPlainSpaces = (value: string): string => value.replaceAll(/\p{Zs}/gu, " ")

const writtenCsv = (): { content: string; fileName: string } => {
  const [fileName, content] = downloadCsvFile.mock.calls[0] ?? []
  if (fileName === undefined || content === undefined) {
    throw new Error("No CSV was written")
  }

  return { content, fileName }
}

const clickExport = () => {
  renderWithProviders(<CustomersExportAction />)
  fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))
}

const dataRow = async (): Promise<string> => {
  await waitFor(() => {
    expect(downloadCsvFile).toHaveBeenCalled()
  })

  return withPlainSpaces(writtenCsv().content.split("\n")[1] ?? "")
}

beforeEach(() => {
  downloadCsvFile.mockReset()
  exportAdminCustomers.mockReset()
  exportAdminCustomers.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

describe("CustomersExportAction", () => {
  it("offers an enabled export action", () => {
    renderWithProviders(<CustomersExportAction />)

    expect(screen.getByRole("button", { name: EXPORT_LABEL })).toBeEnabled()
  })

  it("exports the rows the current filters select", async () => {
    clickExport()

    await waitFor(() => {
      expect(exportAdminCustomers).toHaveBeenCalledWith({ data: { search: "anna" } })
    })
  })

  it("names the downloaded file after the customer table", async () => {
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().fileName).toBe("customers.csv")
    })
  })

  it("writes only the header row for an empty export", async () => {
    clickExport()

    await waitFor(() => {
      expect(writtenCsv().content).toBe(HEADER_ROW)
    })
  })

  it("frees the button again once the export finished", async () => {
    clickExport()

    await waitFor(() => {
      expect(downloadCsvFile).toHaveBeenCalled()
    })
    expect(screen.getByRole("button", { name: EXPORT_LABEL })).toBeEnabled()
  })

  it("writes the customer, the money and the dates of one row", async () => {
    exportAdminCustomers.mockResolvedValue([customerRow])
    clickExport()

    expect(await dataRow()).toBe(
      'user-1,,"Anna Kowalska",anna@example.com,Customer,,Yes,No,"Warszawa, Mazowieckie, PL",2,PLN 120.00,PLN 60.00,"","Mar 14, 2026"',
    )
  })

  it("names the admin role of an administrator", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, role: "admin" }])
    clickExport()

    expect(await dataRow()).toContain(",Admin,")
  })

  it("writes the stripe identifier and the phone number a customer has", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, phone: "+48600123456", stripeCustomerId: "cus_123" }])
    clickExport()

    expect(await dataRow()).toContain('user-1,cus_123,"Anna Kowalska",anna@example.com,Customer,+48600123456,')
  })

  it("says No about an unverified email and Yes about a banned customer", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, banned: true, emailVerified: false }])
    clickExport()

    expect(await dataRow()).toContain(",No,Yes,")
  })

  it("dates the last order of a customer who placed one", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, lastOrderAt: new Date("2026-04-02T09:00:00.000Z") }])
    clickExport()

    expect(await dataRow()).toContain('"Apr 2, 2026","Mar 14, 2026"')
  })

  it("leaves the location empty for a customer with no known address", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, city: undefined, countryCode: undefined, province: undefined }])
    clickExport()

    expect(await dataRow()).toContain('No,"",2,')
  })

  it("escapes the quotes inside a customer name", async () => {
    exportAdminCustomers.mockResolvedValue([{ ...customerRow, name: 'Anna "Ania" Kowalska' }])
    clickExport()

    expect(await dataRow()).toContain('"Anna ""Ania"" Kowalska"')
  })
})

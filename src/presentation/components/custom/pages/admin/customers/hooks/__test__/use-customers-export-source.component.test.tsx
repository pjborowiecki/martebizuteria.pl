import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type User } from "~/src/modules/user/user.types"

const { exportFn } = vi.hoisted(() => ({ exportFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/user/use-cases/export-admin-customers", () => ({
  exportAdminCustomers: ({ data }: Readonly<{ data: unknown }>) => exportFn(data),
}))

import { useCustomersExportSource } from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-export-source"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (input: User["adminCustomersExportInput"]) =>
  renderHook(() => useCustomersExportSource(input), { wrapper: Wrapper }).result.current

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("useCustomersExportSource", () => {
  it("names the customers list and its title", () => {
    expect(sourceFor({})).toMatchObject({ filters: [], list: "customers", title: "Customers" })
  })

  it("describes the stat card, the role and the yes-or-no filters by their labels", () => {
    expect(sourceFor({ banned: false, emailVerified: true, role: "admin", statFilter: "returning" }).filters).toStrictEqual([
      { label: "Quick filter", value: "Returning customers" },
      { label: "Role", value: "Admin" },
      { label: "Email verified", value: "Yes" },
      { label: "Banned", value: "No" },
    ])
  })

  it("names the card of every customer and the customer role", () => {
    expect(sourceFor({ role: "customer", statFilter: "total" }).filters).toStrictEqual([
      { label: "Quick filter", value: "Total Customers" },
      { label: "Role", value: "Customer" },
    ])
  })

  it("describes the spending filters in the shop currency and the date filters in words", () => {
    const { filters } = sourceFor({
      averageOrderValue: { amountMinorUnits: 5000, operator: "lt" },
      createdAt: { date: "2026-01-15", operator: "before" },
      lastOrderAt: { endDate: "2026-10-31", operator: "between", startDate: "2026-10-01" },
      totalSpent: { amountMinorUnits: 100_000, operator: "gte" },
    })

    expect(filters).toStrictEqual([
      { label: "Total Spent", value: `at least ${formatPrice(100_000, "PLN", "en-US")}` },
      { label: "Average order value", value: `less than ${formatPrice(5000, "PLN", "en-US")}` },
      { label: "Last Order", value: "from Oct 1, 2026 to Oct 31, 2026" },
      { label: "Account created", value: "before Jan 15, 2026" },
    ])
  })

  it("loads the export with the input of the list", async () => {
    exportFn.mockResolvedValue([])
    const input = { search: "anna" }

    await sourceFor(input).loadRows?.()

    expect(exportFn).toHaveBeenCalledExactlyOnceWith(input)
  })

  it("reports the search it sends to the server", () => {
    expect(sourceFor({ search: "anna" }).search).toBe("anna")
    expect(sourceFor({}).search).toBeUndefined()
  })
})

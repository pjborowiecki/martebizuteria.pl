import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

const { exportFn } = vi.hoisted(() => ({ exportFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/order/use-cases/export-admin-orders", () => ({
  exportAdminOrders: ({ data }: Readonly<{ data: unknown }>) => exportFn(data),
}))

import { useOrdersExportSource } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-export-source"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (input: Order["adminExportInput"]) => renderHook(() => useOrdersExportSource(input), { wrapper: Wrapper }).result.current

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("useOrdersExportSource", () => {
  it("names the orders list and its title", () => {
    expect(sourceFor({})).toMatchObject({ filters: [], list: "orders", title: "Orders" })
  })

  it("describes the stat card, the status, the payment and the fulfillment by their labels", () => {
    expect(sourceFor({ fulfillment: "shipped", payment: "paid", statFilter: "to_fulfil", status: "processing" }).filters).toStrictEqual([
      { label: "Quick filter", value: "To fulfil" },
      { label: "Status", value: "Open" },
      { label: "Payment", value: "Paid" },
      { label: "Fulfillment", value: "Shipped" },
    ])
  })

  it("names the card of every order", () => {
    expect(sourceFor({ statFilter: "total" }).filters).toStrictEqual([{ label: "Quick filter", value: "Total Orders" }])
  })

  it("describes the total in the store currency and the date in words", () => {
    const { filters } = sourceFor({
      createdAt: { date: "2026-10-01", operator: "after" },
      total: { amountMinorUnits: 10_000, operator: "gte" },
    })

    expect(filters).toStrictEqual([
      { label: "Total", value: `at least ${formatPrice(10_000, "PLN", "en-US")}` },
      { label: "Date", value: "after Oct 1, 2026" },
    ])
  })

  it("loads the export with the input of the list", async () => {
    exportFn.mockResolvedValue([])
    const input = { search: "anna", status: "pending" } as const

    await sourceFor(input).loadRows?.()

    expect(exportFn).toHaveBeenCalledExactlyOnceWith(input)
  })

  it("reports the search it sends to the server", () => {
    expect(sourceFor({ search: "anna" }).search).toBe("anna")
    expect(sourceFor({}).search).toBeUndefined()
  })
})

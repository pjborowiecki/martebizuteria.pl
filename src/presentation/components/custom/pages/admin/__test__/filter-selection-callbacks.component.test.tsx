import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const grid = vi.hoisted(() => ({
  getFilterValue: vi.fn<() => unknown>(() => "pending"),
  setFilterValue: vi.fn<(value: unknown) => void>(),
  setPageIndex: vi.fn<(page: number) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid", () => ({
  customersDataGrid: { useDataGrid: () => ({ table: { getColumn: () => grid, setPageIndex: grid.setPageIndex } }) },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid", () => ({
  ordersDataGrid: { useDataGrid: () => ({ table: { getColumn: () => grid, setPageIndex: grid.setPageIndex } }) },
}))
vi.mock("~/src/presentation/components/shadcn/select", () => ({
  Select: ({ onValueChange }: Readonly<{ onValueChange: (value: string | null) => void }>): JSX.Element => (
    <>
      <button
        type="button"
        onClick={() => {
          onValueChange(null)
        }}
      >
        Empty selection
      </button>
      <button
        type="button"
        onClick={() => {
          onValueChange("obsolete")
        }}
      >
        Obsolete selection
      </button>
    </>
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

import { CustomersBannedFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-banned-filter"
import { CustomersEmailVerifiedFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-email-verified-filter"
import { CustomersRoleFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-role-filter"
import { OrdersFulfillmentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-fulfillment-filter"
import { OrdersPaymentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-payment-filter"
import { OrdersStatusFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-status-filter"

beforeEach(() => {
  vi.clearAllMocks()
  grid.getFilterValue.mockReturnValue("pending")
})

afterEach(cleanup)

describe("customer and order filter selection callbacks", () => {
  it.each([
    { component: CustomersBannedFilter, name: "customer ban" },
    { component: CustomersEmailVerifiedFilter, name: "email verification" },
    { component: CustomersRoleFilter, name: "customer role" },
    { component: OrdersFulfillmentFilter, name: "order fulfillment" },
    { component: OrdersPaymentFilter, name: "order payment" },
    { component: OrdersStatusFilter, name: "order status" },
  ])("preserves the $name filter and current page when Select reports null", ({ component: Filter }) => {
    renderWithProviders(<Filter />)

    fireEvent.click(screen.getByRole("button", { name: "Empty selection" }))

    expect(grid.setFilterValue).not.toHaveBeenCalled()
    expect(grid.setPageIndex).not.toHaveBeenCalled()
  })

  it.each([
    { component: CustomersBannedFilter, name: "customer ban" },
    { component: CustomersEmailVerifiedFilter, name: "email verification" },
  ])("clears an obsolete $name value instead of treating an unknown string as a boolean", ({ component: Filter }) => {
    grid.getFilterValue.mockReturnValue(true)
    renderWithProviders(<Filter />)

    fireEvent.click(screen.getByRole("button", { name: "Obsolete selection" }))

    expect(grid.setFilterValue).toHaveBeenCalledExactlyOnceWith(undefined)
    expect(grid.setPageIndex).toHaveBeenCalledExactlyOnceWith(0)
  })
})

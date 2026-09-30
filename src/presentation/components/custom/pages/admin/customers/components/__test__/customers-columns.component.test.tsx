import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions", () => ({
  CustomersRowActions: () => <span>row actions</span>,
}))

import { useCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-columns"

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    {children}
  </TestProviders>
)

const renderColumns = () => renderHook(() => useCustomerColumns(), { wrapper })

afterEach(() => {
  cleanup()
})

describe("useCustomerColumns", () => {
  it("builds the admin customer table in reading order", () => {
    const { result } = renderColumns()

    expect(result.current.map((column) => column.id)).toStrictEqual([
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.select,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.role,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.location,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt,
      ADMIN_CUSTOMER_TABLE_COLUMN_ID.actions,
    ])
  })

  it("translates the headers into the active locale", () => {
    const { result } = renderColumns()
    const headers = new Map(result.current.map((column) => [column.id, column.header]))

    expect(headers.get(ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer)).toBe("Customer")
    expect(headers.get(ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount)).toBe("Orders")
    expect(headers.get(ADMIN_CUSTOMER_TABLE_COLUMN_ID.location)).toBe("Location")
  })

  it("keeps the same column definitions across renders", () => {
    const { rerender, result } = renderColumns()
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})

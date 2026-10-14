import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_TABLE_COLUMN_ID, ADMIN_ORDER_TABLE_COLUMN_SIZE } from "~/src/modules/order/order.constants"

import { useOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-columns"

vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions", () => ({
  OrdersRowActions: (): JSX.Element => <output data-testid="row-actions" />,
}))

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderColumns = () => renderHook(() => useOrderColumns(), { wrapper: Wrapper })

describe("useOrderColumns", () => {
  it("builds the admin order grid from selection to row actions", () => {
    const { result } = renderColumns()

    expect(result.current.map((column) => column.id)).toStrictEqual([
      ADMIN_ORDER_TABLE_COLUMN_ID.select,
      ADMIN_ORDER_TABLE_COLUMN_ID.orderId,
      ADMIN_ORDER_TABLE_COLUMN_ID.createdAt,
      ADMIN_ORDER_TABLE_COLUMN_ID.customer,
      ADMIN_ORDER_TABLE_COLUMN_ID.email,
      ADMIN_ORDER_TABLE_COLUMN_ID.itemCount,
      ADMIN_ORDER_TABLE_COLUMN_ID.total,
      ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment,
      ADMIN_ORDER_TABLE_COLUMN_ID.status,
      ADMIN_ORDER_TABLE_COLUMN_ID.payment,
      ADMIN_ORDER_TABLE_COLUMN_ID.actions,
    ])
  })

  it("labels the columns with the admin order translations", () => {
    const { result } = renderColumns()
    const byId = new Map(result.current.map((column) => [column.id, column]))

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.orderId)?.header).toBe("Order")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.customer)?.header).toBe("Customer")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.header).toBe("Payment")
  })

  it("keeps the date and total columns wide enough to read in full", () => {
    const { result } = renderColumns()
    const byId = new Map(result.current.map((column) => [column.id, column]))

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.createdAt)?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.createdAt)
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.total)
  })

  it("keeps the status and payment columns wide enough for their badges", () => {
    const { result } = renderColumns()
    const byId = new Map(result.current.map((column) => [column.id, column]))

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.status)
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.payment)
  })

  it("keeps the same column definitions across re-renders", () => {
    const { rerender, result } = renderColumns()
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})

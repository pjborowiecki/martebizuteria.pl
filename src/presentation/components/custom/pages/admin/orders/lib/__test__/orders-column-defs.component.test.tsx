import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_TABLE_COLUMN_ID, ADMIN_ORDER_TABLE_COLUMN_SIZE } from "~/src/modules/order/order.constants"

import { buildOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/lib/orders-column-defs"

vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions", () => ({
  OrdersRowActions: (): JSX.Element => <output data-testid="row-actions" />,
}))

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderColumns = () =>
  renderHook(
    () => {
      const t = useTranslations("pages.admin.orders")
      const tAdmin = useTranslations("pages.admin")

      return buildOrderColumns({ locale: "en-US", t, tAdmin })
    },
    { wrapper: Wrapper },
  )

const columnsById = () => {
  const { result } = renderColumns()

  return new Map(result.current.map((column) => [column.id, column]))
}

describe("buildOrderColumns layout", () => {
  it("lays the grid out from selection to row actions", () => {
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

  it("labels every data column with its localized header", () => {
    const byId = columnsById()

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.orderId)?.header).toBe("Order")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.createdAt)?.header).toBe("Date")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.customer)?.header).toBe("Customer")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.email)?.header).toBe("Email")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.itemCount)?.header).toBe("Items")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.header).toBe("Total")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment)?.header).toBe("Fulfillment")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.header).toBe("Status")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.header).toBe("Payment")
  })

  it("renders the actions header as an element rather than a plain label", () => {
    expect(typeof columnsById().get(ADMIN_ORDER_TABLE_COLUMN_ID.actions)?.header).toBe("function")
  })

  it("sizes each column from the shared constants", () => {
    const byId = columnsById()

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.customer)?.size).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.customer)
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.email)?.size).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.email)
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.itemCount)?.size).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.itemCount)
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.size).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.status)
  })

  it("pins the order id and actions columns to a fixed width", () => {
    const byId = columnsById()
    const orderId = byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.orderId)
    const actions = byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.actions)

    expect(orderId?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.orderId)
    expect(orderId?.maxSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.orderId)
    expect(actions?.minSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.actions)
    expect(actions?.maxSize).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.actions)
  })

  it("lets the date column grow but caps it", () => {
    const createdAt = columnsById().get(ADMIN_ORDER_TABLE_COLUMN_ID.createdAt)

    expect(createdAt?.size).toBe(ADMIN_ORDER_TABLE_COLUMN_SIZE.createdAt)
    expect(createdAt?.maxSize).toBe(320)
  })
})

describe("buildOrderColumns behaviour flags", () => {
  it("disables sorting on every column because the list is server ordered", () => {
    const { result } = renderColumns()

    expect(result.current.every((column) => column.enableSorting === false)).toBe(true)
  })

  it("filters the badge columns by exact value and the numeric ones automatically", () => {
    const byId = columnsById()

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.filterFn).toBe("equalsString")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.filterFn).toBe("equalsString")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment)?.filterFn).toBe("equalsString")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.filterFn).toBe("auto")
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.createdAt)?.filterFn).toBe("auto")
  })

  it("declares no filter for the free text columns", () => {
    const byId = columnsById()

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.email)?.filterFn).toBeUndefined()
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.customer)?.filterFn).toBeUndefined()
  })

  it("keeps the actions column always visible", () => {
    expect(columnsById().get(ADMIN_ORDER_TABLE_COLUMN_ID.actions)?.enableHiding).toBe(false)
  })

  it("stops a row click inside the actions column", () => {
    expect(columnsById().get(ADMIN_ORDER_TABLE_COLUMN_ID.actions)?.meta).toMatchObject({ preventRowClick: true })
  })

  it("gives each column the skeleton variant its cell shape needs", () => {
    const byId = columnsById()

    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.customer)?.meta).toMatchObject({ skeletonVariant: "title" })
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.email)?.meta).toMatchObject({ skeletonVariant: "text" })
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.meta).toMatchObject({ skeletonVariant: "badge" })
    expect(byId.get(ADMIN_ORDER_TABLE_COLUMN_ID.actions)?.meta).toMatchObject({ skeletonVariant: "iconEnd" })
  })
})

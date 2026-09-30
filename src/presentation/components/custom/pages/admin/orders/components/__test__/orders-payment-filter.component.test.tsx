import { type JSX, type ReactNode } from "react"

import { type Table, createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_PAYMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { orderRow } from "~/src/presentation/components/custom/pages/admin/orders/components/__test__/orders-grid-harness"
import { OrdersPaymentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-payment-filter"
import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

type OrderRow = Order["adminListItem"]

const ROWS: OrderRow[] = [
  orderRow({ id: "order-paid", paymentUiKey: ADMIN_ORDER_PAYMENT_UI_KEY.PAID }),
  orderRow({ id: "order-authorized", paymentUiKey: ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED }),
  orderRow({ id: "order-refunded", paymentUiKey: ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED }),
  orderRow({ id: "order-pending", paymentUiKey: "authorized" }),
]

const helper = createColumnHelper<DataGridFeatures, OrderRow>()

const COLUMNS = helper.columns([
  helper.accessor("paymentUiKey", { filterFn: "equalsString", header: "Payment", id: ADMIN_ORDER_TABLE_COLUMN_ID.payment }),
])

const PaymentGridHarness = ({
  children,
  onTable,
}: Readonly<{ children: ReactNode; onTable: (table: Table<DataGridFeatures, OrderRow>) => void }>): JSX.Element => {
  const table = useTable<DataGridFeatures, OrderRow>({
    columns: COLUMNS,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  onTable(table)

  return (
    <ordersDataGrid.Provider
      value={{
        columnReorder: {
          draggedColumnId: undefined,
          onColumnDragEnd: () => {},
          onColumnDragOver: () => {},
          onColumnDragStart: () => {},
        },
        hasPreferenceOverrides: false,
        isLoading: false,
        persistenceKey: ordersDataGrid.persistenceKey,
        resetPreferences: () => {},
        rowReorder: undefined,
        searchPlaceholder: "Search orders",
        table,
      }}
    >
      {children}
    </ordersDataGrid.Provider>
  )
}

const renderPaymentFilter = () => {
  const seen: { table?: Table<DataGridFeatures, OrderRow> } = {}

  renderWithProviders(
    <PaymentGridHarness
      onTable={(table) => {
        seen.table = table
      }}
    >
      <OrdersPaymentFilter />
    </PaymentGridHarness>,
  )

  return seen
}

const trigger = () => screen.getByRole("combobox", { name: "Filter by payment" })

const pick = async (label: string) => {
  await userEvent.click(trigger())
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`No option labelled ${label}`)
  }

  await userEvent.click(target)
}

afterEach(() => {
  cleanup()
})

describe("OrdersPaymentFilter", () => {
  it("starts with no payment filter applied", () => {
    renderPaymentFilter()

    expect(trigger()).toHaveTextContent("All payments")
  })

  it("offers the settled payment states only", async () => {
    renderPaymentFilter()

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All payments", "Paid", "Authorized", "Refunded"])
  })

  it("filters the table down to the chosen payment state", async () => {
    const seen = renderPaymentFilter()

    await pick("Paid")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.getFilterValue()).toBe(ADMIN_ORDER_PAYMENT_UI_KEY.PAID)
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["order-paid"])
  })

  it("shows the chosen payment state on the trigger", async () => {
    renderPaymentFilter()

    await pick("Authorized")

    expect(trigger()).toHaveTextContent("Authorized")
  })

  it("clears the column filter again when all payments is chosen", async () => {
    const seen = renderPaymentFilter()

    await pick("Refunded")
    await pick("All payments")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.payment)?.getFilterValue()).toBeUndefined()
    expect(seen.table?.getFilteredRowModel().rows).toHaveLength(4)
  })

  it("returns the table to the first page whenever the filter changes", async () => {
    const seen = renderPaymentFilter()
    seen.table?.setPageIndex(3)

    await pick("Refunded")

    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(0)
  })
})

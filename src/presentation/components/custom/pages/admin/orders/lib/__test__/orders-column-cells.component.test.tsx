import { type JSX, type ReactNode } from "react"

import { useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions", () => ({
  OrdersRowActions: ({ order }: Readonly<{ order: { id: string } }>): JSX.Element => <output data-testid="row-actions">{order.id}</output>,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { ADMIN_ORDER_FULFILLMENT_UI_KEY } from "~/src/modules/order/order.constants"
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { stubResizeObserver } from "~/src/presentation/components/custom/datagrid/components/__test__/data-grid-harness"
import { DataGridTable } from "~/src/presentation/components/custom/datagrid/components/data-grid-table"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { buildOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/lib/orders-column-defs"

type OrderRow = Order["adminListItem"]

const CREATED_AT = new Date(Date.UTC(2024, 5, 14, 9, 30))

const orderRow = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  fulfillmentStatus: "shipped",
  fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED,
  id: "order-1",
  initials: "AK",
  itemCount: 3,
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 49_800,
  userId: "user-1",
  ...overrides,
})

const columnReorder: ColumnReorderApi = {
  draggedColumnId: undefined,
  onColumnDragEnd: () => {},
  onColumnDragOver: () => {},
  onColumnDragStart: () => {},
}

const OrdersGrid = ({ rows }: Readonly<{ rows: OrderRow[] }>): ReactNode => {
  const t = useTranslations("pages.admin.orders")
  const tAdmin = useTranslations("pages.admin")
  const table = useTable<DataGridFeatures, OrderRow>({
    columns: buildOrderColumns({ locale: "en-US", t, tAdmin }),
    data: rows,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  return <DataGridTable columnReorder={columnReorder} isLoading={false} persistenceKey="test.orders" rowReorder={undefined} table={table} />
}

const renderGrid = (rows: OrderRow[] = [orderRow()]) => renderWithProviders(<OrdersGrid rows={rows} />)

beforeAll(() => {
  stubResizeObserver()
})

afterEach(() => {
  cleanup()
})

describe("order column cells", () => {
  it("prefixes the order id so it reads as a reference", () => {
    renderGrid()

    expect(screen.getByText("#order-1")).toBeInTheDocument()
  })

  it("formats the order date for the active locale", () => {
    renderGrid()

    expect(screen.getByText(formatAdminOrderDate(CREATED_AT, "en-US"))).toBeInTheDocument()
  })

  it("shows the customer name, initials and email", () => {
    renderGrid()

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("AK")).toBeInTheDocument()
    expect(screen.getAllByText("anna@example.com").length).toBeGreaterThan(0)
  })

  it("shows the item count as its own cell", () => {
    renderGrid()

    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("prices the order in its own currency", () => {
    const { container } = renderGrid()
    const cells = [...container.querySelectorAll("tbody td")].map((cell) => cell.textContent)

    expect(cells).toContain(formatPrice(49_800, "PLN", "en-US"))
  })

  it("badges the fulfillment stage, the status and the payment", () => {
    renderGrid()

    expect(screen.getByText("Shipped")).toBeInTheDocument()
    expect(screen.getByText("Processing")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("renders the row actions for the order the row belongs to", () => {
    renderGrid()

    expect(screen.getByTestId("row-actions")).toHaveTextContent("order-1")
  })

  it("hides the row actions header from assistive tech while keeping it labelled", () => {
    renderGrid()

    expect(screen.getByText("Row actions")).toHaveClass("sr-only")
  })

  it("offers a labelled checkbox for the whole page and for each row", () => {
    renderGrid()

    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Select row" })).toBeInTheDocument()
  })

  it("renders one row per order", () => {
    const { container } = renderGrid([orderRow(), orderRow({ id: "order-2" })])

    expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
    expect(screen.getByText("#order-2")).toBeInTheDocument()
  })
})

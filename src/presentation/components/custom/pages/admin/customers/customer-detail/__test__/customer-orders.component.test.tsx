import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

import { dataGridPreferencesStorageKey } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"
import { CustomerOrders } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders"
import { ORDERS_DATA_GRID_KEY } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

const { pageFn } = vi.hoisted(() => ({ pageFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: () => ({ isPending: false, mutate: vi.fn() }),
  useFulfillOrder: () => ({ isPending: false, mutate: vi.fn() }),
  useMarkOrderShipped: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock("~/src/modules/order/use-cases/get-admin-orders-page", () => ({
  getAdminOrdersPageQuery: (input: unknown) => ({
    queryFn: () => pageFn(input),
    queryKey: ["admin", "orders", "page", input],
  }),
}))

const orderRow = (overrides: Partial<Order["adminListItem"]> = {}): Order["adminListItem"] => ({
  createdAt: new Date("2026-01-02T10:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  emailedSteps: [],
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "confirmed",
  hasOpenDispute: false,
  id: "order-1",
  initials: "AK",
  itemCount: 2,
  orderNumber: "MRT-2026-00001",
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 24_900,
  userId: "user-1",
  ...overrides,
})

const page = (items: Order["adminListItem"][], total = items.length) => ({ hasMore: false, items, limit: 10, offset: 0, total })

const renderHistory = () => renderWithProviders(<CustomerOrders customerId="user-1" />)

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row").filter((row) => row.closest("tbody") !== null)

beforeEach(() => {
  pageFn.mockReset()
  pageFn.mockResolvedValue(page([orderRow(), orderRow({ id: "order-2", orderNumber: "MRT-2026-00002", status: "completed" })]))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

describe("CustomerOrders data", () => {
  it("asks the orders list for the first page of this customer's orders only", async () => {
    renderHistory()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: undefined, userId: "user-1" })
    })
  })

  it("searches within this customer's orders from the grid toolbar and starts again from the first page", async () => {
    pageFn.mockResolvedValue(page([orderRow()], 23))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderHistory()
    await screen.findByText("Page 1 of 3")

    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    await waitFor(() => {
      expect(pageFn).toHaveBeenLastCalledWith({ page: 2, pageSize: 10, search: undefined, userId: "user-1" })
    })
    fireEvent.change(screen.getByRole("searchbox", { name: "Search orders…" }), { target: { value: "00002" } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    await waitFor(() => {
      expect(pageFn).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, search: "00002", userId: "user-1" })
    })
  })

  it("keeps its column layout apart from the orders page", async () => {
    localStorage.setItem(dataGridPreferencesStorageKey(ORDERS_DATA_GRID_KEY), JSON.stringify({ columnVisibility: { total: false } }))
    renderHistory()
    await screen.findByText("MRT-2026-00001")

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toContain("Total")
  })
})

describe("CustomerOrders grid", () => {
  it("heads the history with the orders list columns in the shared grid header, without the customer it already belongs to", async () => {
    renderHistory()
    await screen.findByText("MRT-2026-00001")
    const headers = screen.getAllByRole("columnheader")
    const headerText = headers.map((header) => header.textContent)

    expect(headerText).toStrictEqual(expect.arrayContaining(["Order", "Date", "Items", "Total", "Fulfillment", "Status", "Payment"]))
    expect(headerText).not.toContain("Customer")
    expect(headerText).not.toContain("Email")
    expect(headers.find((header) => header.textContent === "Order")).toHaveClass("sticky", "normal-case")
  })

  it("pins only the order number and its actions so the total and progress stay in view in a narrow column", async () => {
    renderHistory()
    await screen.findByText("MRT-2026-00001")
    const pinned = screen.getAllByRole("columnheader").flatMap((header) => {
      const side = header.dataset["pinned"]

      return side === undefined ? [] : [`${header.textContent}:${side}`]
    })

    expect(pinned).toStrictEqual(["Order:start", "Row actions:end"])
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
  })

  it("shows each order with the orders list badges and money", async () => {
    renderHistory()
    await screen.findByText("MRT-2026-00001")
    const [first] = bodyRows()
    if (first === undefined) {
      throw new Error("the history rendered no order rows")
    }

    expect(within(first).getByText("Confirmed")).toBeInTheDocument()
    expect(within(first).getByText("Open")).toBeInTheDocument()
    expect(within(first).getByText("Paid")).toBeInTheDocument()
    expect(first).toHaveTextContent("PLN 249.00")
  })

  it("shows an order whose fulfilment started as in progress, as on the order page", async () => {
    pageFn.mockResolvedValue(page([orderRow({ fulfillmentStatus: "fulfilled", fulfillmentUiKey: "processing" })]))
    renderHistory()
    await screen.findByText("MRT-2026-00001")
    const [first] = bodyRows()
    if (first === undefined) {
      throw new Error("the history rendered no order rows")
    }

    expect(within(first).getByText("In progress")).toBeInTheDocument()
  })

  it("offers the orders row actions on every order in a cell that does not open the order", async () => {
    renderHistory()
    await screen.findByText("MRT-2026-00001")
    const triggers = bodyRows().map((row) => row.querySelector("[data-slot='dropdown-menu-trigger']"))

    expect(triggers).toHaveLength(2)
    expect(triggers.every((trigger) => trigger?.closest("[data-prevent-row-click]") !== null)).toBe(true)
  })

  it("opens the exact order chosen from the history", async () => {
    const { router } = renderHistory()
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue()

    fireEvent.click(await screen.findByText("MRT-2026-00002"))

    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ params: { orderId: "order-2" }, to: "/admin/orders/$orderId" }),
    )
  })

  it("pages through a long history instead of listing every order at once", async () => {
    pageFn.mockResolvedValue(page([orderRow()], 23))
    renderHistory()
    await screen.findByText("MRT-2026-00001")

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })
})

describe("CustomerOrders layout", () => {
  it("always offers a way through to the full order list", () => {
    renderHistory()

    expect(screen.getByRole("heading", { name: "Order History" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "/admin/orders")
  })

  it("takes the rest of the main column on wide, tall screens and lets the grid scroll inside it", () => {
    const { container } = renderHistory()
    const section = container.firstElementChild
    const stack = section?.firstElementChild

    expect(section).toHaveClass("flex", "flex-col", "2xl:[@media(min-height:57rem)]:min-h-60", "2xl:[@media(min-height:57rem)]:flex-1")
    expect(section).not.toHaveClass("flex-1")
    expect(stack).toHaveClass("h-fit", "max-h-full", "min-h-0", "flex-col", "overflow-hidden", "gap-3")
    expect(stack?.lastElementChild).toHaveClass("max-h-full", "min-h-0", "grid-rows-[auto_minmax(0,1fr)_auto]")
  })
})

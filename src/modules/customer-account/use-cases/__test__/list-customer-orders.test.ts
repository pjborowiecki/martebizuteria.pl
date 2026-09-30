import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { listCustomerOrders, listCustomerOrdersQuery } from "~/src/modules/customer-account/use-cases/list-customer-orders"

interface OrderItemRow {
  readonly orderId: string
  readonly quantity: number
  readonly thumbnail: string | null
  readonly title: string
  readonly total: number
  readonly variantTitle: string | null
}

interface OrderRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly fulfillmentStatus: "cancelled" | "delivered" | "fulfilled" | "shipped" | "unfulfilled"
  readonly id: string
  readonly status: "cancelled" | "completed" | "paid" | "pending" | "refunded"
  readonly total: number
}

const CALLER_CONTEXT = { auth: { session: { id: "current-session" }, user: { id: "customer-1" } } }

const accessors = vi.hoisted(() => ({
  getCustomerOrderRows: vi.fn(),
  getOrderItemsForOrders: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => `https://cdn.example.com/${path}` }))
vi.mock("~/src/modules/customer-account/customer-account.accessors.server", () => accessors)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT }) => unknown) => () => handler({ context: CALLER_CONTEXT }),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const orderRow = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currencyCode: "PLN",
  fulfillmentStatus: "unfulfilled",
  id: "order-1",
  status: "paid",
  total: 12_000,
  ...overrides,
})

const itemRow = (overrides: Partial<OrderItemRow> = {}): OrderItemRow => ({
  orderId: "order-1",
  quantity: 1,
  thumbnail: null,
  title: "Silver ring",
  total: 12_000,
  variantTitle: null,
  ...overrides,
})

const withRows = (orders: readonly OrderRow[], items: readonly OrderItemRow[]) => {
  accessors.getCustomerOrderRows.mockResolvedValue(orders)
  accessors.getOrderItemsForOrders.mockResolvedValue(items)
}

describe("listCustomerOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the orders of the authenticated customer only", async () => {
    withRows([], [])

    await listCustomerOrders()

    expect(accessors.getCustomerOrderRows).toHaveBeenCalledWith("customer-1")
  })

  it("skips the item lookup keys when the customer has no orders", async () => {
    withRows([], [])

    await expect(listCustomerOrders()).resolves.toStrictEqual([])
    expect(accessors.getOrderItemsForOrders).toHaveBeenCalledWith([])
  })

  it("asks for the items of every returned order", async () => {
    withRows([orderRow(), orderRow({ id: "order-2" })], [])

    await listCustomerOrders()

    expect(accessors.getOrderItemsForOrders).toHaveBeenCalledWith(["order-1", "order-2"])
  })

  it("attaches each item to its own order and keeps the order sequence", async () => {
    withRows(
      [orderRow(), orderRow({ id: "order-2" })],
      [
        itemRow({ title: "Ring" }),
        itemRow({ orderId: "order-2", title: "Bracelet" }),
        itemRow({ orderId: "order-1", quantity: 2, title: "Pendant" }),
      ],
    )

    const orders = await listCustomerOrders()

    expect(orders.map((order) => [order.id, order.items.map((item) => item.name)])).toStrictEqual([
      ["order-1", ["Ring", "Pendant"]],
      ["order-2", ["Bracelet"]],
    ])
  })

  it("leaves an order without items with an empty item list", async () => {
    withRows([orderRow(), orderRow({ id: "order-2" })], [itemRow()])

    const orders = await listCustomerOrders()

    expect(orders[1]?.items).toStrictEqual([])
  })

  it("maps the order totals, currency and derived filter status", async () => {
    withRows([orderRow({ fulfillmentStatus: "shipped" })], [itemRow({ quantity: 3, total: 9000, variantTitle: "Size 12" })])

    const orders = await listCustomerOrders()

    expect(orders[0]).toStrictEqual({
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
      currencyCode: "PLN",
      filterStatus: "shipped",
      fulfillmentStatus: "shipped",
      id: "order-1",
      items: [{ image: undefined, name: "Silver ring", priceMinorUnits: 9000, qty: 3, variantTitle: "Size 12" }],
      status: "paid",
      totalMinorUnits: 12_000,
    })
  })

  it("builds a cdn url for an item that has a thumbnail", async () => {
    withRows([orderRow()], [itemRow({ thumbnail: "rings/silver.webp" })])

    const orders = await listCustomerOrders()

    expect(orders[0]?.items[0]?.image).toBe("https://cdn.example.com/rings/silver.webp")
  })
})

describe("listCustomerOrdersQuery", () => {
  it("uses the shared orders key and stale window", () => {
    const options = listCustomerOrdersQuery()

    expect(options.queryKey).toStrictEqual(CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS)
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("reads the caller's own orders when the cache runs the query", async () => {
    withRows([orderRow()], [itemRow()])

    await expect(new QueryClient().query(listCustomerOrdersQuery())).resolves.toStrictEqual([expect.objectContaining({ id: "order-1" })])
  })
})

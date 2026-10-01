import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE,
  CUSTOMER_ACCOUNT_QUERY_KEYS,
  CUSTOMER_ACCOUNT_QUERY_STALE_MS,
} from "~/src/modules/customer-account/customer-account.constants"
import { listCustomerOrders, listCustomerOrdersQuery } from "~/src/modules/customer-account/use-cases/list-customer-orders"

interface OrderItemRow {
  readonly handle: string | null
  readonly id: string
  readonly orderId: string
  readonly quantity: number
  readonly thumbnail: string | null
  readonly title: string
  readonly total: number
  readonly unitPrice: number
  readonly variantTitle: string | null
}

interface OrderRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly fulfillmentStatus: "cancelled" | "delivered" | "fulfilled" | "shipped" | "unfulfilled"
  readonly id: string
  readonly orderNumber: string
  readonly status: "cancelled" | "completed" | "paid" | "pending" | "refunded"
  readonly total: number
}

const CALLER_CONTEXT = { auth: { session: { id: "current-session" }, user: { id: "customer-1" } } }

const accessors = vi.hoisted(() => ({
  countCustomerOrders: vi.fn(),
  getCustomerOrderRows: vi.fn(),
  getOrderItemsForOrders: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => `https://cdn.example.com/${path}` }))
vi.mock("~/src/modules/customer-account/customer-account.accessors.server", () => accessors)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: CALLER_CONTEXT, data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { context: typeof CALLER_CONTEXT; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            Promise.resolve(options?.data).then((data) => handler({ context: CALLER_CONTEXT, data: validate(data) })),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const orderRow = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currencyCode: "PLN",
  fulfillmentStatus: "unfulfilled",
  id: "order-1",
  orderNumber: "MRT-2026-00001",
  status: "paid",
  total: 12_000,
  ...overrides,
})

const itemRow = (overrides: Partial<OrderItemRow> = {}): OrderItemRow => ({
  handle: "silver-ring",
  id: "item-1",
  orderId: "order-1",
  quantity: 1,
  thumbnail: null,
  title: "Silver ring",
  total: 12_000,
  unitPrice: 12_000,
  variantTitle: null,
  ...overrides,
})

const withRows = (orders: readonly OrderRow[], items: readonly OrderItemRow[], total = orders.length) => {
  accessors.getCustomerOrderRows.mockResolvedValue(orders)
  accessors.getOrderItemsForOrders.mockResolvedValue(items)
  accessors.countCustomerOrders.mockResolvedValue(total)
}

const listOrders = (data: Record<string, unknown> = {}) => listCustomerOrders({ data })

describe("listCustomerOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the first page of the authenticated customer's own orders", async () => {
    withRows([], [])

    await listOrders()

    expect(accessors.getCustomerOrderRows).toHaveBeenCalledWith("customer-1", {
      filter: "all",
      limit: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE,
      offset: 0,
    })
    expect(accessors.countCustomerOrders).toHaveBeenCalledWith("customer-1", "all")
  })

  it("skips the orders already shown when a later page is asked for", async () => {
    withRows([], [])

    await listOrders({ page: 3 })

    expect(accessors.getCustomerOrderRows).toHaveBeenCalledWith("customer-1", {
      filter: "all",
      limit: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE,
      offset: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE * 2,
    })
  })

  it("asks the database for the chosen status rather than filtering a page in the browser", async () => {
    withRows([], [])

    await listOrders({ filter: "cancelled" })

    expect(accessors.getCustomerOrderRows).toHaveBeenCalledWith("customer-1", {
      filter: "cancelled",
      limit: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE,
      offset: 0,
    })
    expect(accessors.countCustomerOrders).toHaveBeenCalledWith("customer-1", "cancelled")
  })

  it("rejects a status that is not one of the account filters", async () => {
    withRows([], [])

    await expect(listOrders({ filter: "paid" })).rejects.toThrow()
  })

  it("reports how many orders the filter matches in total, not just this page", async () => {
    withRows([orderRow()], [itemRow()], 42)

    const page = await listOrders()

    expect(page).toMatchObject({ page: 1, pageSize: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE, total: 42 })
  })

  it("skips the item lookup keys when the customer has no orders", async () => {
    withRows([], [])

    const page = await listOrders()

    expect(page.orders).toStrictEqual([])
    expect(accessors.getOrderItemsForOrders).toHaveBeenCalledWith([])
  })

  it("asks for the items of every returned order", async () => {
    withRows([orderRow(), orderRow({ id: "order-2" })], [])

    await listOrders()

    expect(accessors.getOrderItemsForOrders).toHaveBeenCalledWith(["order-1", "order-2"])
  })

  it("attaches each item to its own order and keeps the order sequence", async () => {
    withRows(
      [orderRow(), orderRow({ id: "order-2" })],
      [
        itemRow({ title: "Ring" }),
        itemRow({ id: "item-2", orderId: "order-2", title: "Bracelet" }),
        itemRow({ id: "item-3", orderId: "order-1", quantity: 2, title: "Pendant" }),
      ],
    )

    const page = await listOrders()

    expect(page.orders.map((order) => [order.id, order.items.map((item) => item.name)])).toStrictEqual([
      ["order-1", ["Ring", "Pendant"]],
      ["order-2", ["Bracelet"]],
    ])
  })

  it("leaves an order without items with an empty item list", async () => {
    withRows([orderRow(), orderRow({ id: "order-2" })], [itemRow()])

    const page = await listOrders()

    expect(page.orders[1]?.items).toStrictEqual([])
  })

  it("maps the order totals, currency and derived filter status", async () => {
    withRows(
      [orderRow({ fulfillmentStatus: "shipped" })],
      [itemRow({ quantity: 3, total: 9000, unitPrice: 3000, variantTitle: "Size 12" })],
    )

    const page = await listOrders()

    expect(page.orders[0]).toStrictEqual({
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
      currencyCode: "PLN",
      filterStatus: "shipped",
      fulfillmentStatus: "shipped",
      id: "order-1",
      itemCount: 3,
      items: [
        {
          handle: "silver-ring",
          id: "item-1",
          image: undefined,
          lineTotalMinorUnits: 9000,
          name: "Silver ring",
          qty: 3,
          unitPriceMinorUnits: 3000,
          variantTitle: "Size 12",
        },
      ],
      orderNumber: "MRT-2026-00001",
      status: "paid",
      totalMinorUnits: 12_000,
    })
  })

  it("shows a refunded order under its own status instead of calling it processing", async () => {
    withRows([orderRow({ status: "refunded" })], [itemRow()])

    const page = await listOrders()

    expect(page.orders[0]?.filterStatus).toBe("refunded")
  })

  it("builds a cdn url for an item that has a thumbnail", async () => {
    withRows([orderRow()], [itemRow({ thumbnail: "rings/silver.webp" })])

    const page = await listOrders()

    expect(page.orders[0]?.items[0]?.image).toBe("https://cdn.example.com/rings/silver.webp")
  })
})

describe("listCustomerOrdersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keys the page by its filter and page number so each page caches on its own", () => {
    const options = listCustomerOrdersQuery({ filter: "shipped", page: 2 })

    expect(options.queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS, "shipped", 2])
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("defaults to the first page of every order", () => {
    expect(listCustomerOrdersQuery().queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS, "all", 1])
  })

  it("reads the caller's own orders when the cache runs the query", async () => {
    withRows([orderRow()], [itemRow()])

    await expect(new QueryClient().query(listCustomerOrdersQuery())).resolves.toMatchObject({
      orders: [expect.objectContaining({ id: "order-1" })],
    })
  })
})

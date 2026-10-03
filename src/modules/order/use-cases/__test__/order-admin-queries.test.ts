import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { ADMIN_ORDER_DETAIL_TAG, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { exportAdminOrders } from "../export-admin-orders"
import { getAdminOrder, getAdminOrderQuery } from "../get-admin-order"
import { getAdminOrderStats, getAdminOrderStatsQuery } from "../get-admin-order-stats"
import { getAdminOrdersPage, getAdminOrdersPageQuery } from "../get-admin-orders-page"

interface SourceRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string | null
  readonly email: string
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly id: string
  readonly itemCount: number | null
  readonly paymentStatus: string | null
  readonly status: Order["select"]["status"]
  readonly total: number
  readonly userId: string | null
}

const CREATED_AT = new Date(1_700_000_000_000)

const sourceRow = (overrides: Partial<SourceRow> = {}): SourceRow => ({
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerName: "Ada Lovelace",
  email: "ada@example.test",
  fulfillmentStatus: "shipped",
  id: "order-1",
  itemCount: 3,
  paymentStatus: "succeeded",
  status: "processing",
  total: 19_900,
  userId: "user-1",
  ...overrides,
})

const accessors = vi.hoisted(() => {
  const pageParams: unknown[] = []
  const exportParams: unknown[] = []

  return {
    exportParams,
    getAdminOrderCustomerStats: vi.fn(() => Promise.resolve({ orderCount: 1, totalSpent: 0 })),
    getAdminOrderDetailRow: vi.fn(),
    getAdminOrderItemRows: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
    getAdminOrderStats: vi.fn(() => Promise.resolve({ pending: 2, total: 9 })),
    getAdminOrderTimelineRows: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
    getAdminOrdersExport: vi.fn((params: unknown) => {
      exportParams.push(params)

      return Promise.resolve(accessors.rows)
    }),
    getAdminOrdersPage: vi.fn((params: unknown) => {
      pageParams.push(params)

      return Promise.resolve({ rows: accessors.rows, total: accessors.total })
    }),
    pageParams,
    rows: [] as unknown[],
    total: 0,
  }
})

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getAdminOrderCustomerStats: accessors.getAdminOrderCustomerStats,
  getAdminOrderDetailRow: accessors.getAdminOrderDetailRow,
  getAdminOrderItemRows: accessors.getAdminOrderItemRows,
  getAdminOrderStats: accessors.getAdminOrderStats,
  getAdminOrderTimelineRows: accessors.getAdminOrderTimelineRows,
  getAdminOrdersExport: accessors.getAdminOrdersExport,
  getAdminOrdersPage: accessors.getAdminOrdersPage,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  accessors.pageParams.length = 0
  accessors.exportParams.length = 0
  accessors.rows = [sourceRow()]
  accessors.total = 1
})

describe("getAdminOrdersPage parameters", () => {
  it("defaults to the first page and the shared page size", async () => {
    await getAdminOrdersPage({ data: {} })

    expect(accessors.pageParams[0]).toMatchObject({ limit: 25, offset: 0 })
  })

  it("turns a page number into an offset", async () => {
    await getAdminOrdersPage({ data: { page: 3, pageSize: 10 } })

    expect(accessors.pageParams[0]).toMatchObject({ limit: 10, offset: 20 })
  })

  it("passes every column filter through untouched", async () => {
    await getAdminOrdersPage({
      data: { fulfillment: "shipped", payment: "paid", statFilter: "pending", status: "processing", tab: "unfulfilled" },
    })

    expect(accessors.pageParams[0]).toMatchObject({
      filters: { createdAt: undefined, fulfillment: "shipped", payment: "paid", status: "processing", total: undefined },
      statFilter: "pending",
      tab: "unfulfilled",
    })
  })

  it("trims the search term", async () => {
    await getAdminOrdersPage({ data: { search: "  ada  " } })

    expect(accessors.pageParams[0]).toMatchObject({ search: "ada" })
  })

  it("drops a blank search term", async () => {
    await getAdminOrdersPage({ data: { search: "   " } })

    expect(accessors.pageParams[0]).toMatchObject({ search: undefined })
  })
})

describe("getAdminOrdersPage result", () => {
  it("maps each row into an admin list item", async () => {
    const { items } = await getAdminOrdersPage({ data: {} })

    expect(items).toStrictEqual([
      {
        createdAt: CREATED_AT,
        currencyCode: "PLN",
        customerName: "Ada Lovelace",
        email: "ada@example.test",
        fulfillmentStatus: "shipped",
        fulfillmentUiKey: "shipped",
        id: "order-1",
        initials: "AL",
        itemCount: 3,
        paymentUiKey: "paid",
        status: "processing",
        totalMinorUnits: 19_900,
        userId: "user-1",
      },
    ])
  })

  it("falls back to the email when the customer has no name", async () => {
    accessors.rows = [sourceRow({ customerName: null, itemCount: null })]

    const { items } = await getAdminOrdersPage({ data: {} })

    expect(items[0]).toMatchObject({ customerName: "ada@example.test", itemCount: 0 })
  })

  it("reports more pages when the total exceeds the page", async () => {
    accessors.total = 9

    await expect(getAdminOrdersPage({ data: {} })).resolves.toMatchObject({ hasMore: true, limit: 25, offset: 0, total: 9 })
  })

  it("reports no more pages once the offset plus the page covers the total", async () => {
    accessors.total = 1

    await expect(getAdminOrdersPage({ data: {} })).resolves.toMatchObject({ hasMore: false })
  })

  it("keys the page query by the filters it was given", () => {
    const input = { tab: "pending" } as const

    expect(getAdminOrdersPageQuery(input).queryKey).toStrictEqual([...ORDER_QUERY_KEYS.ADMIN.PAGE, input])
  })
})

describe("exportAdminOrders", () => {
  it("asks for every matching row without pagination", async () => {
    await exportAdminOrders({ data: { tab: "delivered" } })

    expect(accessors.exportParams[0]).toStrictEqual({
      filters: { createdAt: undefined, fulfillment: undefined, payment: undefined, status: undefined, total: undefined },
      search: undefined,
      statFilter: undefined,
      tab: "delivered",
    })
  })

  it("returns the mapped list items rather than the raw rows", async () => {
    const items = await exportAdminOrders({ data: {} })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: "order-1", paymentUiKey: "paid" })
  })

  it("marks a pending order as pending regardless of its fulfillment status", async () => {
    accessors.rows = [sourceRow({ fulfillmentStatus: "fulfilled", status: "pending" })]

    const items = await exportAdminOrders({ data: {} })

    expect(items[0]).toMatchObject({ fulfillmentUiKey: "pending" })
  })
})

describe("getAdminOrderStats", () => {
  it("returns the counts the accessor reports", async () => {
    await expect(getAdminOrderStats()).resolves.toStrictEqual({ pending: 2, total: 9 })
  })

  it("keys the stats query by the shared admin stats key", () => {
    expect(getAdminOrderStatsQuery().queryKey).toStrictEqual(ORDER_QUERY_KEYS.ADMIN.STATS)
  })

  it("keeps the cached stats out of a refetch on mount or focus", () => {
    const options = getAdminOrderStatsQuery()

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the stats through the server function", async () => {
    await expect(new QueryClient().query(getAdminOrderStatsQuery())).resolves.toStrictEqual({ pending: 2, total: 9 })
  })
})

it("loads the requested order page through its cache query", async () => {
  await expect(new QueryClient().query(getAdminOrdersPageQuery({ page: 2, pageSize: 10 }))).resolves.toMatchObject({ total: 1 })
  expect(accessors.pageParams[0]).toMatchObject({ limit: 10, offset: 10 })
})

const DETAIL_ORDER_ID = "6f1c2a9e-4b7d-4e3a-9c51-2d8f0b7a6e14"

const detailAddress = (overrides: Record<string, unknown> = {}) => ({
  address1: "ul. Dluga 1",
  address2: null,
  city: "Krakow",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "30-001",
  province: null,
  ...overrides,
})

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  addresses: [],
  canceledAt: null,
  checkout: {
    billingAddress: detailAddress({ address1: "ul. Firmowa 2" }),
    billingAddressId: "addr-bill",
    shippingAddress: detailAddress(),
    shippingAddressId: "addr-ship",
  },
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerNote: null,
  deliveredAt: null,
  deliveryMethod: null,
  discountTotal: 0,
  email: "ada@example.test",
  fulfillmentStatus: "not_fulfilled",
  id: DETAIL_ORDER_ID,
  lockerId: null,
  metadata: null,
  orderNumber: "MRT-2026-00001",
  payment: null,
  shippedAt: null,
  shippingTotal: 1500,
  status: "processing",
  subtotal: 10_000,
  taxTotal: 2100,
  total: 11_500,
  trackingNumber: null,
  trackingUrl: null,
  user: { id: "user-1", name: "Ada Lovelace", phone: null },
  userId: "user-1",
  ...overrides,
})

const fetchAdminOrder = () => getAdminOrder({ data: { orderId: DETAIL_ORDER_ID } })

describe("getAdminOrder addresses", () => {
  it("shows the addresses the order was placed with after the customer edits their address book", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress({ address1: "ul. Snapshot 9", firstName: "Ada", lastName: "Nowak" }), type: "shipping" },
          { ...detailAddress({ address1: "ul. Faktura 3" }), type: "billing" },
        ],
        checkout: {
          billingAddress: detailAddress({ address1: "ul. Edited 1" }),
          billingAddressId: "addr-bill",
          shippingAddress: detailAddress({ address1: "ul. Edited 1" }),
          shippingAddressId: "addr-ship",
        },
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress).toStrictEqual({
      city: "Krakow",
      countryCode: "PL",
      line1: "ul. Snapshot 9",
      line2: undefined,
      name: "Ada Nowak",
      phone: undefined,
      postalCode: "30-001",
      province: undefined,
    })
    expect(detail?.billingAddress?.line1).toBe("ul. Faktura 3")
    expect(detail?.billingSameAsShipping).toBe(false)
  })

  it("keeps the order's addresses and their match after the customer deletes them from their address book", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress({ address1: "ul. Snapshot 9" }), type: "shipping" },
          { ...detailAddress({ address1: "ul. Snapshot 9" }), type: "billing" },
        ],
        checkout: { billingAddress: null, billingAddressId: null, shippingAddress: null, shippingAddressId: null },
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress?.line1).toBe("ul. Snapshot 9")
    expect(detail?.billingAddress?.line1).toBe("ul. Snapshot 9")
    expect(detail?.billingSameAsShipping).toBe(true)
  })

  it("compares the snapshots rather than the checkout's address ids once the order has them", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress(), type: "shipping" },
          { ...detailAddress({ address1: "ul. Faktura 3" }), type: "billing" },
        ],
        checkout: {
          billingAddress: detailAddress({ address1: "ul. Edited 1" }),
          billingAddressId: "addr-ship",
          shippingAddress: detailAddress({ address1: "ul. Edited 1" }),
          shippingAddressId: "addr-ship",
        },
      }),
    )

    await expect(fetchAdminOrder()).resolves.toMatchObject({ billingSameAsShipping: false })
  })

  it("falls back to the checkout's address rows for an order placed before snapshots were written", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress?.line1).toBe("ul. Dluga 1")
    expect(detail?.billingAddress?.line1).toBe("ul. Firmowa 2")
    expect(detail?.billingSameAsShipping).toBe(false)
  })

  it("falls back to the checkout's address ids for an order placed before snapshots were written", async () => {
    const sharedAddress = detailAddress()
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        checkout: {
          billingAddress: sharedAddress,
          billingAddressId: "addr-ship",
          shippingAddress: sharedAddress,
          shippingAddressId: "addr-ship",
        },
      }),
    )

    await expect(fetchAdminOrder()).resolves.toMatchObject({ billingSameAsShipping: true })
  })

  it("leaves both addresses out when neither a snapshot nor a checkout address exists", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ checkout: null }))

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress).toBeUndefined()
    expect(detail?.billingAddress).toBeUndefined()
  })
})

const FULFILLMENT_STARTED_AT = new Date(1_700_000_100_000)

const paymentRow = (overrides: Record<string, unknown> = {}) => ({
  amount: 11_500,
  provider: "stripe",
  refundedAmount: 0,
  refundedAt: null,
  status: "succeeded",
  transactionId: "cs_test_1",
  ...overrides,
})

const lockerDelivery = { courier: { name: "InPost" }, name: "Paczkomat 24/7", type: "locker" }

describe("getAdminOrder delivery and payment", () => {
  it("reports nothing for an order that does not exist without reading its lines", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(undefined)

    await expect(fetchAdminOrder()).resolves.toBeUndefined()
    expect(accessors.getAdminOrderItemRows).not.toHaveBeenCalled()
    expect(accessors.getAdminOrderTimelineRows).not.toHaveBeenCalled()
  })

  it("shows the courier, parcel locker and Stripe payment the order was placed with", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ deliveryMethod: lockerDelivery, lockerId: "WAW01A", payment: paymentRow() }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.delivery).toStrictEqual({ courierName: "InPost", lockerId: "WAW01A", methodName: "Paczkomat 24/7", type: "locker" })
    expect(detail?.payment).toStrictEqual({
      amountMinorUnits: 11_500,
      provider: "stripe",
      refundedAmountMinorUnits: 0,
      refundedAt: undefined,
      status: "succeeded",
      transactionId: "cs_test_1",
    })
    expect(detail?.paymentUiKey).toBe("paid")
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.LOCKER)
  })

  it("dates a partial refund and leaves out a locker and transaction id the order never had", async () => {
    const refundedAt = new Date(1_700_000_200_000)
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        deliveryMethod: { ...lockerDelivery, name: "Kurier DPD", type: "courier" },
        payment: paymentRow({ refundedAmount: 5000, refundedAt, transactionId: null }),
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.delivery?.lockerId).toBeUndefined()
    expect(detail?.payment).toMatchObject({ refundedAmountMinorUnits: 5000, refundedAt, transactionId: undefined })
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.PARTIALLY_REFUNDED)
  })
})

describe("getAdminOrder customer, lines and timeline", () => {
  it("trims the customer's note and tags the order with it", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ customerNote: "  Please gift wrap.  " }))

    const detail = await fetchAdminOrder()

    expect(detail?.customerNote).toBe("Please gift wrap.")
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.NOTE)
  })

  it("treats a blank note as no note at all", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ customerNote: "   " }))

    const detail = await fetchAdminOrder()

    expect(detail?.customerNote).toBeUndefined()
    expect(detail?.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.NOTE)
  })

  it("reads a guest order without looking up a customer history", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ user: null, userId: null }))

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderCustomerStats).not.toHaveBeenCalled()
    expect(detail?.customer).toMatchObject({ name: "ada@example.test", orderCount: 0, totalSpentMinorUnits: 0, userId: undefined })
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.GUEST)
  })

  it("reads the customer history of an order placed from an account", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderCustomerStats).toHaveBeenCalledWith("user-1")
    expect(detail?.customer).toMatchObject({ name: "Ada Lovelace", orderCount: 1, userId: "user-1" })
  })

  it("lists the order lines and the timeline the accessors return", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())
    accessors.getAdminOrderItemRows.mockResolvedValueOnce([
      {
        id: "item-1",
        productHandle: "aura-hoop",
        quantity: 2,
        sku: "AUR-HP-GD",
        thumbnail: "products/aura.jpg",
        title: "Aura Hoop",
        total: 10_000,
        unitPrice: 5000,
        variantTitle: "Gold",
      },
    ])
    accessors.getAdminOrderTimelineRows.mockResolvedValueOnce([
      {
        action: AUDIT_LOG_ACTION.ORDER_PLACED,
        actorName: "System",
        createdAt: CREATED_AT,
        detail: null,
        id: "audit-1",
        severity: "success",
      },
    ])

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderItemRows).toHaveBeenCalledWith(DETAIL_ORDER_ID)
    expect(detail?.items).toStrictEqual([
      {
        id: "item-1",
        imageUrl: "products/aura.jpg",
        productHandle: "aura-hoop",
        quantity: 2,
        sku: "AUR-HP-GD",
        title: "Aura Hoop",
        totalMinorUnits: 10_000,
        unitPriceMinorUnits: 5000,
        variantTitle: "Gold",
      },
    ])
    expect(detail?.timeline.map((event) => event.id)).toStrictEqual(["audit-1"])
  })

  it("dates the processing step from the latest fulfillment start in the timeline", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())
    accessors.getAdminOrderTimelineRows.mockResolvedValueOnce([
      {
        action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
        actorName: "Admin",
        createdAt: CREATED_AT,
        detail: null,
        id: "audit-2",
        severity: "info",
      },
      {
        action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
        actorName: "Admin",
        createdAt: FULFILLMENT_STARTED_AT,
        detail: null,
        id: "audit-3",
        severity: "info",
      },
    ])

    const detail = await fetchAdminOrder()

    expect(detail?.fulfillmentSteps.find((step) => step.key === "processing")).toStrictEqual({
      at: FULFILLMENT_STARTED_AT,
      done: true,
      key: "processing",
    })
  })
})

describe("getAdminOrderQuery", () => {
  it("keys the detail query by the order id", () => {
    expect(getAdminOrderQuery(DETAIL_ORDER_ID).queryKey).toStrictEqual([...ORDER_QUERY_KEYS.ADMIN.ORDER_BY_ID, DETAIL_ORDER_ID])
  })

  it("keeps the cached order out of a refetch on mount or focus", () => {
    const options = getAdminOrderQuery(DETAIL_ORDER_ID)

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("loads the order through the server function", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    await expect(new QueryClient().query(getAdminOrderQuery(DETAIL_ORDER_ID))).resolves.toMatchObject({
      displayId: "MRT-2026-00001",
      id: DETAIL_ORDER_ID,
    })
  })

  it("sends a missing order to the route's not found boundary", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(undefined)

    await expect(new QueryClient().query(getAdminOrderQuery(DETAIL_ORDER_ID))).rejects.toSatisfy(isNotFound)
  })
})

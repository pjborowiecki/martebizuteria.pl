import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerOverview, getCustomerOverviewQuery } from "~/src/modules/customer-account/use-cases/get-customer-overview"
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"

interface AuditRow {
  readonly action: string
  readonly createdAt: Date
  readonly detail: string | null
  readonly metadata: string | null
}

interface OrderRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly fulfillmentStatus: "cancelled" | "delivered" | "fulfilled" | "shipped" | "unfulfilled"
  readonly id: string
  readonly status: "cancelled" | "completed" | "paid" | "pending" | "refunded"
  readonly total: number
}

const MEMBER_SINCE = new Date("2024-05-01T00:00:00.000Z")

const CALLER_CONTEXT = { auth: { session: { id: "session-1" }, user: { createdAt: MEMBER_SINCE, id: "customer-1" } } }

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const access = vi.hoisted(() => ({
  auditRows: vi.fn(),
  collectionFindFirst: vi.fn(),
  orderItems: vi.fn(),
  orderRows: vi.fn(),
  publishedProducts: vi.fn(),
  stats: vi.fn(),
  userById: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { query: { productCollection: { findFirst: access.collectionFindFirst } } },
}))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/modules/customer-account/customer-account.accessors.server", () => ({
  getCustomerActivityAuditRows: access.auditRows,
  getCustomerOrderRows: access.orderRows,
  getOrderItemsForOrders: access.orderItems,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({ getPublishedProductsByCollectionId: access.publishedProducts }))
vi.mock("~/src/modules/user/user.accessors", () => ({ getCustomerOrderStatsQuery: access.stats, getUserById: access.userById }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT; data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ ...options, context: CALLER_CONTEXT }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        validated.parse = validate

        return builder
      },
    }

    return builder
  },
}))

const auditRow = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  action: "auth.login",
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  detail: null,
  metadata: null,
  ...overrides,
})

const orderRow = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currencyCode: "PLN",
  fulfillmentStatus: "shipped",
  id: "order-1",
  status: "paid",
  total: 12_000,
  ...overrides,
})

const overview = () => getCustomerOverview({ data: { locale: "en-US" } })

describe("getCustomerOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.auditRows.mockResolvedValue([])
    access.collectionFindFirst.mockResolvedValue(undefined)
    access.orderItems.mockResolvedValue([])
    access.orderRows.mockResolvedValue([])
    access.publishedProducts.mockResolvedValue({ items: [] })
    access.stats.mockResolvedValue([])
    access.userById.mockResolvedValue(undefined)
  })

  it("reads everything for the authenticated customer only", async () => {
    await overview()

    expect(access.stats).toHaveBeenCalledWith(["customer-1"])
    expect(access.orderRows).toHaveBeenCalledWith("customer-1", 3)
    expect(access.auditRows).toHaveBeenCalledWith("customer-1")
    expect(access.userById).toHaveBeenCalledWith("customer-1")
  })

  it("starts a brand new customer at zero without a stats row", async () => {
    const result = await overview()

    expect(result?.stats).toStrictEqual({
      memberSinceYear: "2024",
      totalOrders: 0,
      totalSpentMinorUnits: 0,
      wishlistCount: 0,
    })
  })

  it("reports the stats row that belongs to the caller", async () => {
    access.stats.mockResolvedValue([
      { orderCount: 9, totalSpent: 90_000, userId: "someone-else" },
      { orderCount: 4, totalSpent: 48_000, userId: "customer-1" },
    ])

    const result = await overview()

    expect(result?.stats.totalOrders).toBe(4)
    expect(result?.stats.totalSpentMinorUnits).toBe(48_000)
  })

  it("prefers the stored account creation year over the session copy", async () => {
    access.userById.mockResolvedValue({ createdAt: new Date("2022-01-02T00:00:00.000Z") })

    const result = await overview()

    expect(result?.stats.memberSinceYear).toBe("2022")
  })

  it("attaches the order items to their own order", async () => {
    access.orderRows.mockResolvedValue([orderRow(), orderRow({ id: "order-2" })])
    access.orderItems.mockResolvedValue([
      { orderId: "order-2", quantity: 1, thumbnail: null, title: "Bracelet", total: 4000, variantTitle: null },
      { orderId: "order-1", quantity: 2, thumbnail: null, title: "Ring", total: 8000, variantTitle: null },
    ])

    const result = await overview()

    expect(result?.recentOrders.map((order) => [order.id, order.items.map((item) => item.name)])).toStrictEqual([
      ["order-1", ["Ring"]],
      ["order-2", ["Bracelet"]],
    ])
  })

  it("keeps at most five activity entries", async () => {
    access.auditRows.mockResolvedValue(Array.from({ length: 8 }, () => auditRow()))

    const result = await overview()

    expect(result?.activity).toHaveLength(5)
  })

  it("drops audit rows that carry no readable activity", async () => {
    access.auditRows.mockResolvedValue([auditRow({ action: "customer.cart_item_added", detail: "" }), auditRow()])

    const result = await overview()

    expect(result?.activity.map((item) => item.actionKey)).toStrictEqual(["loginSuccess"])
  })

  it("recommends nothing while the new arrivals collection is missing", async () => {
    const result = await overview()

    expect(result?.recommendations).toStrictEqual([])
    expect(access.publishedProducts).not.toHaveBeenCalled()
  })

  it("recommends three products from the new arrivals collection", async () => {
    access.collectionFindFirst.mockResolvedValue({ id: "collection-1" })
    access.publishedProducts.mockResolvedValue({
      items: [
        {
          handle: "silver-ring",
          id: "product-1",
          thumbnail: "products/ring.webp",
          titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
          variants: [{ price: 120_000 }],
        },
      ],
    })

    const result = await overview()

    expect(access.publishedProducts).toHaveBeenCalledWith("collection-1", { limit: 3, offset: 0 })
    expect(result?.recommendations).toStrictEqual([
      {
        handle: "silver-ring",
        image: "cdn/products/ring.webp",
        name: "Silver ring",
        priceMinorUnits: 120_000,
        productId: "product-1",
      },
    ])
  })

  it("recommends a product without a variant price rather than hiding it", async () => {
    access.collectionFindFirst.mockResolvedValue({ id: "collection-1" })
    access.publishedProducts.mockResolvedValue({
      items: [
        { handle: "silver-ring", id: "product-1", thumbnail: null, titles: { "en-US": "Silver ring", "pl-PL": "Srebrny" }, variants: [] },
      ],
    })

    const result = await overview()

    expect(result?.recommendations[0]?.priceMinorUnits).toBeUndefined()
  })

  it("names the recommendation in the requested locale", async () => {
    access.collectionFindFirst.mockResolvedValue({ id: "collection-1" })
    access.publishedProducts.mockResolvedValue({
      items: [
        {
          handle: "silver-ring",
          id: "product-1",
          thumbnail: null,
          titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
          variants: [],
        },
      ],
    })

    const result = await getCustomerOverview({ data: { locale: "pl-PL" } })

    expect(result?.recommendations[0]?.name).toBe("Srebrny pierscionek")
  })
})

describe("getCustomerOverview recommendation collection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.auditRows.mockResolvedValue([])
    access.orderItems.mockResolvedValue([])
    access.orderRows.mockResolvedValue([])
    access.publishedProducts.mockResolvedValue({ items: [] })
    access.stats.mockResolvedValue([])
    access.userById.mockResolvedValue(undefined)
  })

  it("looks the recommendation collection up by the new arrivals handle", async () => {
    const lookup: { current?: unknown } = {}
    access.collectionFindFirst.mockImplementation(
      (options: { where: (columns: { handle: string }, operators: { eq: (column: unknown, value: unknown) => unknown }) => unknown }) => {
        lookup.current = options.where({ handle: "product_collection.handle" }, { eq: (column, value) => ({ column, value }) })

        return Promise.resolve(undefined)
      },
    )

    await overview()

    expect(lookup.current).toStrictEqual({ column: "product_collection.handle", value: LANDING_NEW_ARRIVALS_COLLECTION_HANDLE })
  })
})

describe("getCustomerOverview input validation", () => {
  it("defaults to no locale when the caller sends nothing", () => {
    expect(validated.parse?.(undefined)).toStrictEqual({})
  })

  it("accepts a locale", () => {
    expect(validated.parse?.({ locale: "pl-PL" })).toStrictEqual({ locale: "pl-PL" })
  })

  it("rejects a locale that is not a string", () => {
    expect(() => validated.parse?.({ locale: 42 })).toThrow()
  })
})

describe("getCustomerOverview partial account data", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.auditRows.mockResolvedValue([])
    access.collectionFindFirst.mockResolvedValue({ id: "collection-1" })
    access.orderItems.mockResolvedValue([])
    access.orderRows.mockResolvedValue([orderRow()])
    access.publishedProducts.mockResolvedValue({
      items: [{ handle: "ring", id: "product-1", thumbnail: null, titles: { "en-US": "Ring", "pl-PL": "Pierścionek" }, variants: [] }],
    })
    access.stats.mockResolvedValue([])
    access.userById.mockResolvedValue(undefined)
  })

  it("uses the default locale when the caller does not choose one", async () => {
    const result = await getCustomerOverview({ data: {} })

    expect(result?.recommendations[0]?.name).toBe("Pierścionek")
  })

  it("keeps a historical order visible when its item rows are no longer available", async () => {
    const result = await overview()

    expect(result?.recentOrders).toHaveLength(1)
    expect(result?.recentOrders[0]).toMatchObject({ id: "order-1", items: [] })
  })
})

describe("getCustomerOverviewQuery", () => {
  it("keys the overview by locale", () => {
    const options = getCustomerOverviewQuery("en-US")

    expect(options.queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW, "en-US"])
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("falls back to the store locale", () => {
    expect(getCustomerOverviewQuery().queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW, "pl-PL"])
  })
})

describe("getCustomerOverviewQuery fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.auditRows.mockResolvedValue([])
    access.collectionFindFirst.mockResolvedValue({ id: "collection-1" })
    access.orderItems.mockResolvedValue([])
    access.orderRows.mockResolvedValue([])
    access.publishedProducts.mockResolvedValue({
      items: [
        {
          handle: "silver-ring",
          id: "product-1",
          thumbnail: null,
          titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
          variants: [{ price: 120_000 }],
        },
      ],
    })
    access.stats.mockResolvedValue([{ orderCount: 2, totalSpent: 24_000, userId: "customer-1" }])
    access.userById.mockResolvedValue(undefined)
  })

  it("reads the overview once and caches it under its locale", async () => {
    const queryClient = new QueryClient()
    const overviewForLocale = getCustomerOverviewQuery("en-US")

    const result = await queryClient.query(overviewForLocale)

    expect(result?.stats.totalOrders).toBe(2)
    expect(queryClient.getQueryData(overviewForLocale.queryKey)).toBe(result)
  })

  it("asks for the overview in the locale it was keyed with", async () => {
    const queryClient = new QueryClient()

    const result = await queryClient.query(getCustomerOverviewQuery("pl-PL"))

    expect(result?.recommendations[0]?.name).toBe("Srebrny pierscionek")
  })
})

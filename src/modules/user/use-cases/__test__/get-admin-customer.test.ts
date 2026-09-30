import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_PAYMENT_UI_KEY } from "~/src/modules/order/order.constants"
import { ADMIN_CUSTOMER_DETAIL_TAGS, ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const access = vi.hoisted(() => ({
  adminOrderRows: vi.fn(),
  auditTimeline: vi.fn(),
  categoryBreakdown: vi.fn(),
  defaultAddress: vi.fn(),
  latestSession: vi.fn(),
  monthlySpending: vi.fn(),
  orderItemTitles: vi.fn(),
  orderStats: vi.fn(),
  preferredCategory: vi.fn(),
  preferredCollection: vi.fn(),
  userById: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/user/user.accessors", () => ({
  getAdminCustomerOrderRowsQuery: access.adminOrderRows,
  getCustomerAuditTimelineQuery: access.auditTimeline,
  getCustomerCategoryBreakdownQuery: access.categoryBreakdown,
  getCustomerMonthlySpendingQuery: access.monthlySpending,
  getCustomerOrderStatsQuery: access.orderStats,
  getCustomerPreferredCategoryQuery: access.preferredCategory,
  getCustomerPreferredCollectionQuery: access.preferredCollection,
  getDefaultCustomerAddressFullQuery: access.defaultAddress,
  getLatestSessionActivityQuery: access.latestSession,
  getOrderItemTitlesQuery: access.orderItemTitles,
  getUserById: access.userById,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler(options),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        validated.parse = validate

        return builder
      },
    }

    return builder
  },
}))

import { getAdminCustomer, getAdminCustomerQuery } from "~/src/modules/user/use-cases/get-admin-customer"

const CREATED_AT = new Date("2023-04-18T09:30:00.000Z")

const UPDATED_AT = new Date("2024-11-02T12:00:00.000Z")

const ORDER_AT = new Date("2025-06-10T08:00:00.000Z")

const DATE_PARTS = { day: "numeric", month: "short", year: "numeric" } as const

const userRow = (overrides: Partial<User["select"]> = {}): User["select"] => ({
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: CREATED_AT,
  email: "anna@example.com",
  emailVerified: false,
  id: "customer-1",
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  phone: null,
  role: "customer",
  stripeCustomerId: null,
  timezone: null,
  twoFactorEnabled: false,
  updatedAt: UPDATED_AT,
  ...overrides,
})

interface StubOrderRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly fulfillmentStatus: "cancelled" | "delivered" | "fulfilled" | "shipped" | "unfulfilled"
  readonly id: string
  readonly paymentStatus: string | null
  readonly status: "cancelled" | "completed" | "paid" | "pending" | "refunded"
  readonly total: number
}

const orderRow = (overrides: Partial<StubOrderRow> = {}): StubOrderRow => ({
  createdAt: ORDER_AT,
  currencyCode: "PLN",
  fulfillmentStatus: "shipped",
  id: "order-1",
  paymentStatus: "succeeded",
  status: "completed",
  total: 24_000,
  ...overrides,
})

const addressRow = (overrides: Partial<Record<string, string | null>> = {}) => ({
  address1: "ul. Krucza 1",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  postalCode: "00-001",
  province: null,
  ...overrides,
})

const detail = (locale = "en-US") => getAdminCustomer({ data: { id: "customer-1", locale } })

const resetAccessors = (): void => {
  vi.clearAllMocks()
  access.adminOrderRows.mockResolvedValue([])
  access.auditTimeline.mockResolvedValue([])
  access.categoryBreakdown.mockResolvedValue([])
  access.defaultAddress.mockResolvedValue([])
  access.latestSession.mockResolvedValue([])
  access.monthlySpending.mockResolvedValue([])
  access.orderItemTitles.mockResolvedValue([])
  access.orderStats.mockResolvedValue([])
  access.preferredCategory.mockResolvedValue([])
  access.preferredCollection.mockResolvedValue([])
  access.userById.mockResolvedValue(userRow())
}

describe("getAdminCustomer reads", () => {
  beforeEach(resetAccessors)

  it("returns nothing for a user id that does not exist", async () => {
    access.userById.mockResolvedValue(undefined)

    await expect(detail()).resolves.toBeUndefined()
    expect(access.adminOrderRows).not.toHaveBeenCalled()
  })

  it("loads every detail query for the requested customer", async () => {
    await detail()

    expect(access.orderStats).toHaveBeenCalledWith(["customer-1"])
    expect(access.defaultAddress).toHaveBeenCalledWith("customer-1")
    expect(access.latestSession).toHaveBeenCalledWith("customer-1")
    expect(access.auditTimeline).toHaveBeenCalledWith("customer-1")
  })

  it("asks for the item titles of the orders it just read", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow(), orderRow({ id: "order-2" })])

    await detail()

    expect(access.orderItemTitles).toHaveBeenCalledWith(["order-1", "order-2"])
  })

  it("starts the spending window on the first of the month eleven months back", async () => {
    await detail()

    const expected = new Date()
    expected.setMonth(expected.getMonth() - 11)
    expected.setDate(1)
    expected.setHours(0, 0, 0, 0)

    expect(access.monthlySpending).toHaveBeenCalledWith("customer-1", expected)
  })

  it("builds one bucket per month of the window", async () => {
    access.monthlySpending.mockResolvedValue([{ amount: 5000, monthKey: "2025-06" }])

    const result = await detail()

    expect(result?.monthlySpending).toHaveLength(12)
  })

  it("falls back to the store locale when the caller sends none", async () => {
    const result = await getAdminCustomer({ data: { id: "customer-1" } })

    expect(result?.joinDate).toBe(CREATED_AT.toLocaleDateString(I18N.DEFAULT_LOCALE, DATE_PARTS))
  })

  it("formats the join date in the requested locale", async () => {
    const result = await detail()

    expect(result?.joinDate).toBe(CREATED_AT.toLocaleDateString("en-US", DATE_PARTS))
  })
})

describe("getAdminCustomer spending totals", () => {
  beforeEach(resetAccessors)

  it("reports zeros for a customer who never ordered", async () => {
    const result = await detail()

    expect(result?.orderCount).toBe(0)
    expect(result?.totalSpent).toBe(0)
    expect(result?.averageOrderValue).toBe(0)
    expect(result?.returningRate).toBe(0)
    expect(result?.isReturning).toBe(false)
  })

  it("averages the spend over the order count", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: null, orderCount: 3, totalSpent: 30_100, userId: "customer-1" }])

    const result = await detail()

    expect(result?.averageOrderValue).toBe(10_033)
  })

  it("treats two orders as a returning customer", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: null, orderCount: 2, totalSpent: 20_000, userId: "customer-1" }])

    const result = await detail()

    expect(result?.isReturning).toBe(true)
    expect(result?.returningRate).toBe(100)
  })

  it("ignores stats rows that belong to another customer", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: null, orderCount: 9, totalSpent: 90_000, userId: "someone-else" }])

    const result = await detail()

    expect(result?.orderCount).toBe(0)
  })

  it("exposes the last order date the stats row carries", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: ORDER_AT, orderCount: 1, totalSpent: 24_000, userId: "customer-1" }])

    const result = await detail()

    expect(result?.lastOrderAt).toStrictEqual(ORDER_AT)
  })
})

describe("getAdminCustomer orders", () => {
  beforeEach(resetAccessors)

  it("formats the money of each order in the requested locale", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])

    const result = await detail()

    expect(result?.orders[0]?.totalMinor).toBe(24_000)
    expect(result?.orders[0]?.total).toBe("PLN 240.00")
  })

  it("dates each order with the store locale the admin table shares", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])

    const result = await detail()

    expect(result?.orders[0]?.date).toBe(ORDER_AT.toLocaleDateString(I18N.DEFAULT_LOCALE, DATE_PARTS))
  })

  it("maps the payment and fulfillment keys the admin table renders", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])

    const result = await detail()

    expect(result?.orders[0]?.payment).toBe(ADMIN_ORDER_PAYMENT_UI_KEY.PAID)
    expect(result?.orders[0]?.fulfillment).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED)
  })

  it("marks a pending order as pending regardless of its fulfillment row", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow({ paymentStatus: null, status: "pending" })])

    const result = await detail()

    expect(result?.orders[0]?.fulfillment).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING)
    expect(result?.orders[0]?.payment).toBe(ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED)
  })

  it("groups every item title under the order it belongs to", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow(), orderRow({ id: "order-2" })])
    access.orderItemTitles.mockResolvedValue([
      { orderId: "order-1", title: "Silver ring" },
      { orderId: "order-2", title: "Gold bracelet" },
      { orderId: "order-1", title: "Pearl earrings" },
    ])

    const result = await detail()

    expect(result?.orders.map((order) => order.itemTitles)).toStrictEqual([["Silver ring", "Pearl earrings"], ["Gold bracelet"]])
  })

  it("leaves an order without item rows with an empty title list", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])

    const result = await detail()

    expect(result?.orders[0]?.itemTitles).toStrictEqual([])
  })
})

describe("getAdminCustomer taste breakdown", () => {
  beforeEach(resetAccessors)

  it("localizes each category label it keeps", async () => {
    access.categoryBreakdown.mockResolvedValue([{ amount: 12_000, titles: { "en-US": "Rings", "pl-PL": "Pierscionki" } }])

    const result = await detail()

    expect(result?.categoryBreakdown).toStrictEqual([{ amount: 12_000, category: "Rings" }])
  })

  it("prefers the Polish label when Polish is asked for", async () => {
    access.categoryBreakdown.mockResolvedValue([{ amount: 12_000, titles: { "en-US": "Rings", "pl-PL": "Pierscionki" } }])

    const result = await detail("pl-PL")

    expect(result?.categoryBreakdown[0]?.category).toBe("Pierscionki")
  })

  it("drops breakdown rows without titles and rows that spent nothing", async () => {
    access.categoryBreakdown.mockResolvedValue([
      { amount: 12_000, titles: null },
      { amount: 0, titles: { "en-US": "Rings", "pl-PL": "Pierscionki" } },
    ])

    const result = await detail()

    expect(result?.categoryBreakdown).toStrictEqual([])
  })

  it("reports no preferred category when the query found none", async () => {
    const result = await detail()

    expect(result?.preferredCategory).toBeUndefined()
    expect(result?.preferredCollection).toBeUndefined()
  })

  it("names the preferred category and collection", async () => {
    access.preferredCategory.mockResolvedValue([{ titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" } }])
    access.preferredCollection.mockResolvedValue([{ titles: { "en-US": "Bridal", "pl-PL": "Slubna" } }])

    const result = await detail()

    expect(result?.preferredCategory).toBe("Necklaces")
    expect(result?.preferredCollection).toBe("Bridal")
  })

  it("treats a preferred category row with null titles as none", async () => {
    access.preferredCategory.mockResolvedValue([{ titles: null }])

    const result = await detail()

    expect(result?.preferredCategory).toBeUndefined()
  })

  it("shows no preferred category when its titles are blank in every locale", async () => {
    access.preferredCategory.mockResolvedValue([{ titles: { "en-US": "   ", "pl-PL": "" } }])

    const result = await detail()

    expect(result?.preferredCategory).toBeUndefined()
  })

  it("treats blank collection titles as no preferred collection", async () => {
    access.preferredCollection.mockResolvedValue([{ titles: { "en-US": "  ", "pl-PL": "" } }])

    const result = await detail()

    expect(result?.preferredCollection).toBeUndefined()
  })
})

describe("getAdminCustomer profile", () => {
  beforeEach(resetAccessors)

  it("keeps the stored user columns on the payload", async () => {
    const result = await detail()

    expect(result?.id).toBe("customer-1")
    expect(result?.email).toBe("anna@example.com")
    expect(result?.initials).toBe("AK")
  })

  it("has no address or address form without a default address row", async () => {
    const result = await detail()

    expect(result?.address).toBeUndefined()
    expect(result?.addressForm).toBeUndefined()
  })

  it("builds the one line address and the editable form from the default address", async () => {
    access.defaultAddress.mockResolvedValue([addressRow()])

    const result = await detail()

    expect(result?.address).toBe("ul. Krucza 1, 00-001 Warszawa, PL")
    expect(result?.addressForm).toStrictEqual({
      address1: "ul. Krucza 1",
      address2: undefined,
      city: "Warszawa",
      countryCode: "PL",
      postalCode: "00-001",
      province: undefined,
    })
  })

  it("keeps the optional address lines the row carries", async () => {
    access.defaultAddress.mockResolvedValue([addressRow({ address2: "apt. 4", province: "Mazowieckie" })])

    const result = await detail()

    expect(result?.addressForm?.address2).toBe("apt. 4")
    expect(result?.addressForm?.province).toBe("Mazowieckie")
  })

  it("leaves the postal code out of the form and the one line address when the row has none", async () => {
    access.defaultAddress.mockResolvedValue([addressRow({ postalCode: null })])

    const result = await detail()

    expect(result?.addressForm?.postalCode).toBeUndefined()
    expect(result?.address).toBe("ul. Krucza 1, Warszawa, PL")
  })

  it("reads the admin notes and tags out of the metadata column", async () => {
    access.userById.mockResolvedValue(userRow({ metadata: JSON.stringify({ notes: "VIP client", tags: ["vip", " "] }) }))

    const result = await detail()

    expect(result?.notes).toBe("VIP client")
    expect(result?.customTags).toStrictEqual(["vip"])
  })

  it("leaves the custom tags empty when the metadata column is blank", async () => {
    const result = await detail()

    expect(result?.customTags).toStrictEqual([])
    expect(result?.notes).toBeUndefined()
  })

  it("badges an admin account as an admin", async () => {
    access.userById.mockResolvedValue(userRow({ role: "admin" }))

    const result = await detail()

    expect(result?.roleBadgeKey).toBe("roleAdmin")
    expect(result?.tags).toStrictEqual([ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN])
  })

  it("badges a repeat buyer as returning", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: null, orderCount: 4, totalSpent: 40_000, userId: "customer-1" }])

    const result = await detail()

    expect(result?.roleBadgeKey).toBe("returning")
    expect(result?.tags).toStrictEqual([ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER, ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING])
  })

  it("badges a first time buyer as a customer", async () => {
    const result = await detail()

    expect(result?.roleBadgeKey).toBe("roleCustomer")
  })

  it("tags a verified and banned account", async () => {
    access.userById.mockResolvedValue(userRow({ banned: true, emailVerified: true }))

    const result = await detail()

    expect(result?.tags).toStrictEqual([
      ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER,
      ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED,
      ADMIN_CUSTOMER_DETAIL_TAGS.BANNED,
    ])
  })
})

describe("getAdminCustomer last activity", () => {
  beforeEach(resetAccessors)

  it("prefers the latest session over the order history", async () => {
    access.latestSession.mockResolvedValue([{ lastActiveAt: new Date("2025-07-01T00:00:00.000Z") }])
    access.orderStats.mockResolvedValue([{ lastOrderAt: ORDER_AT, orderCount: 1, totalSpent: 100, userId: "customer-1" }])

    const result = await detail()

    expect(result?.lastActive).toBe(new Date("2025-07-01T00:00:00.000Z").toLocaleDateString("en-US", DATE_PARTS))
  })

  it("falls back to the last order when there is no session row", async () => {
    access.orderStats.mockResolvedValue([{ lastOrderAt: ORDER_AT, orderCount: 1, totalSpent: 100, userId: "customer-1" }])

    const result = await detail()

    expect(result?.lastActive).toBe(ORDER_AT.toLocaleDateString("en-US", DATE_PARTS))
  })

  it("falls back to the row update stamp when the customer never ordered", async () => {
    const result = await detail()

    expect(result?.lastActive).toBe(UPDATED_AT.toLocaleDateString("en-US", DATE_PARTS))
  })
})

describe("getAdminCustomer timeline", () => {
  beforeEach(resetAccessors)

  it("always opens with the account creation event", async () => {
    const result = await detail()

    expect(result?.timeline).toStrictEqual([{ date: CREATED_AT.toLocaleDateString("en-US", DATE_PARTS), kind: "account_created" }])
  })

  it("sorts the newest event first", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])
    access.auditTimeline.mockResolvedValue([
      { action: "auth.login", createdAt: new Date("2026-01-05T10:00:00.000Z"), detail: null, metadata: null },
    ])

    const result = await detail()

    expect(result?.timeline.map((event) => event.kind)).toStrictEqual(["signed_in", "order_placed", "account_created"])
  })

  it("prices the order placed event", async () => {
    access.adminOrderRows.mockResolvedValue([orderRow()])

    const result = await detail()

    expect(result?.timeline[0]).toStrictEqual({
      date: ORDER_AT.toLocaleDateString("en-US", DATE_PARTS),
      kind: "order_placed",
      orderId: "order-1",
      total: "PLN 240.00",
    })
  })

  it("reads the product title and quantity out of the audit metadata", async () => {
    access.auditTimeline.mockResolvedValue([
      {
        action: "customer.cart_item_added",
        createdAt: new Date("2026-01-05T10:00:00.000Z"),
        detail: null,
        metadata: JSON.stringify({ productTitle: "Silver ring", quantity: 3 }),
      },
    ])

    const result = await detail()

    expect(result?.timeline[0]).toStrictEqual({
      date: new Date("2026-01-05T10:00:00.000Z").toLocaleDateString("en-US", DATE_PARTS),
      kind: "cart_item_added",
      productTitle: "Silver ring",
      quantity: 3,
    })
  })

  it("skips audit rows the timeline has no shape for", async () => {
    access.auditTimeline.mockResolvedValue([
      { action: "order.refunded", createdAt: new Date("2026-01-05T10:00:00.000Z"), detail: null, metadata: null },
    ])

    const result = await detail()

    expect(result?.timeline.map((event) => event.kind)).toStrictEqual(["account_created"])
  })
})

describe("getAdminCustomer input validation", () => {
  it("accepts an id with an optional locale", () => {
    expect(validated.parse?.({ id: "customer-1", locale: "pl-PL" })).toStrictEqual({ id: "customer-1", locale: "pl-PL" })
  })

  it("rejects a missing id", () => {
    expect(() => validated.parse?.({})).toThrow()
  })

  it("rejects an empty id", () => {
    expect(() => validated.parse?.({ id: "" })).toThrow()
  })
})

describe("getAdminCustomerQuery", () => {
  it("keys the detail by customer and locale", () => {
    const options = getAdminCustomerQuery("customer-1", "en-US")

    expect(options.queryKey).toStrictEqual([...USER_QUERY_KEYS.ADMIN.CUSTOMER_BY_ID, "customer-1", "en-US"])
    expect(options.staleTime).toBe(ADMIN_CUSTOMER_QUERY_STALE_MS)
  })

  it("stays disabled until an id is known", () => {
    expect(getAdminCustomerQuery("", "en-US").enabled).toBe(false)
    expect(getAdminCustomerQuery("customer-1", "en-US").enabled).toBe(true)
  })

  it("does not refetch on mount or focus", () => {
    const options = getAdminCustomerQuery("customer-1", "en-US")

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

describe("getAdminCustomerQuery fetching", () => {
  beforeEach(resetAccessors)

  it("asks the server function for the customer the key names", async () => {
    const result = await getAdminCustomerQuery("customer-1", "pl-PL").queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: [...USER_QUERY_KEYS.ADMIN.CUSTOMER_BY_ID, "customer-1", "pl-PL"],
      signal: new AbortController().signal,
    })

    expect(access.userById).toHaveBeenCalledWith("customer-1")
    expect(result?.email).toBe("anna@example.com")
    expect(result?.joinDate).toBe(CREATED_AT.toLocaleDateString("pl-PL", DATE_PARTS))
  })

  it("raises a not found for a customer the detail read cannot find", async () => {
    access.userById.mockResolvedValue(undefined)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const caught: { thrown?: unknown } = {}
    try {
      await client.query(getAdminCustomerQuery("customer-gone", "en-US"))
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(isNotFound(caught.thrown)).toBe(true)
  })
})

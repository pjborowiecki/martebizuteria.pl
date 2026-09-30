import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { formatShortDate } from "~/src/modules/_core/utils/datetime"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { ADMIN_CUSTOMER_DETAIL_TAGS, ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import {
  buildAdminCustomerMonthlySpendingSeries,
  buildAdminCustomerTimeline,
  computeAdminCustomerStatsFromAggregates,
  filterAdminCustomersByStat,
  formatAdminCustomerDetailKpiPrice,
  formatAdminCustomerFullAddress,
  formatAdminCustomerLastActive,
  formatAdminCustomerLocation,
  mapCustomerOrderStats,
  normalizeAverageProductsPerOrder,
  resolveAdminCustomerAverageOrderValue,
  resolveAdminCustomerInitials,
  resolveAdminCustomerReturningRate,
  resolveAdminCustomerTags,
  toAdminCustomerListItem,
} from "~/src/modules/user/user.utils"

const NOW = new Date(2024, 5, 15, 12, 0, 0)

const userRow = (overrides: Partial<User["select"]> = {}): User["select"] => ({
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: new Date(2023, 2, 4),
  email: "anna@example.com",
  emailVerified: false,
  id: "user-1",
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  phone: null,
  role: ROLES.CUSTOMER,
  stripeCustomerId: null,
  timezone: null,
  twoFactorEnabled: false,
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

describe("resolveAdminCustomerAverageOrderValue", () => {
  it("divides lifetime spend by order count, rounded to the nearest minor unit", () => {
    expect(resolveAdminCustomerAverageOrderValue(3, 10_000)).toBe(3333)
  })

  it.each([[0], [-1]])("avoids dividing by an order count of %i", (orderCount) => {
    expect(resolveAdminCustomerAverageOrderValue(orderCount, 10_000)).toBe(0)
  })
})

describe("resolveAdminCustomerInitials", () => {
  it("takes the first letter of the first and last name parts", () => {
    expect(resolveAdminCustomerInitials("Anna Kowalska")).toBe("AK")
  })

  it("uses the last part when there are middle names", () => {
    expect(resolveAdminCustomerInitials("Anna Maria Kowalska")).toBe("AK")
  })

  it("takes two letters from a single name", () => {
    expect(resolveAdminCustomerInitials("anna")).toBe("AN")
    expect(resolveAdminCustomerInitials("A")).toBe("A")
  })

  it("collapses repeated whitespace", () => {
    expect(resolveAdminCustomerInitials("  Anna   Kowalska  ")).toBe("AK")
  })

  it("falls back to a placeholder for a nameless account", () => {
    expect(resolveAdminCustomerInitials("   ")).toBe("?")
    expect(resolveAdminCustomerInitials("")).toBe("?")
  })
})

describe("formatAdminCustomerLocation", () => {
  it("joins city, province and country", () => {
    expect(formatAdminCustomerLocation({ city: "Warszawa", countryCode: "PL", province: "Mazowieckie" })).toBe("Warszawa, Mazowieckie, PL")
  })

  it("skips a missing or blank province", () => {
    expect(formatAdminCustomerLocation({ city: "Warszawa", countryCode: "PL", province: null })).toBe("Warszawa, PL")
    expect(formatAdminCustomerLocation({ city: "Warszawa", countryCode: "PL", province: "  " })).toBe("Warszawa, PL")
  })

  it("falls back to the country alone when there is no locality", () => {
    expect(formatAdminCustomerLocation({ city: "  ", countryCode: "PL" })).toBe("PL")
  })

  it("reports nothing when the customer has no address", () => {
    expect(formatAdminCustomerLocation(undefined)).toBeUndefined()
  })
})

describe("toAdminCustomerListItem", () => {
  it("merges the order aggregates and the default address into the row", () => {
    const item = toAdminCustomerListItem(
      userRow(),
      { lastOrderAt: new Date(2024, 4, 1), orderCount: 2, totalSpent: 20_000 },
      { city: "Warszawa", countryCode: "PL", province: "Mazowieckie" },
    )

    expect(item).toMatchObject({
      averageOrderValue: 10_000,
      city: "Warszawa",
      countryCode: "PL",
      orderCount: 2,
      province: "Mazowieckie",
      totalSpent: 20_000,
    })
  })

  it("reports a customer who has never ordered as all zeroes", () => {
    const item = toAdminCustomerListItem(userRow(), undefined, undefined)

    expect(item).toMatchObject({ averageOrderValue: 0, orderCount: 0, totalSpent: 0 })
    expect(item.lastOrderAt).toBeUndefined()
    expect(item.city).toBeUndefined()
  })

  it("normalises a null province to absent", () => {
    expect(toAdminCustomerListItem(userRow(), undefined, { city: "Warszawa", countryCode: "PL", province: null }).province).toBeUndefined()
  })
})

describe("normalizeAverageProductsPerOrder", () => {
  it.each([
    [2.449, 2.4],
    [2.45, 2.5],
    ["3.14", 3.1],
  ])("rounds %j to one decimal", (value, expected) => {
    expect(normalizeAverageProductsPerOrder(value)).toBe(expected)
  })

  it.each([[null], [undefined]])("treats %j as zero", (value) => {
    expect(normalizeAverageProductsPerOrder(value)).toBe(0)
  })
})

describe("computeAdminCustomerStatsFromAggregates", () => {
  it("derives the returning rate from customers who have ordered, not from every account", () => {
    expect(
      computeAdminCustomerStatsFromAggregates({
        averageLtv: 12_345.6,
        averageProductsPerOrder: 2.44,
        customersWithOrders: 8,
        repeatCustomers: 3,
        total: 20,
      }),
    ).toStrictEqual({ averageLtv: 12_346, averageProductsPerOrder: 2.4, returningRate: 38, total: 20 })
  })

  it("avoids dividing by zero when nobody has ordered yet", () => {
    expect(
      computeAdminCustomerStatsFromAggregates({
        averageLtv: null,
        averageProductsPerOrder: null,
        customersWithOrders: 0,
        repeatCustomers: 0,
        total: 5,
      }),
    ).toStrictEqual({ averageLtv: 0, averageProductsPerOrder: 0, returningRate: 0, total: 5 })
  })

  it("reads the string counts that D1 aggregates return", () => {
    expect(
      computeAdminCustomerStatsFromAggregates({
        averageLtv: "5000",
        averageProductsPerOrder: "1",
        customersWithOrders: "4",
        repeatCustomers: "4",
        total: "4",
      }),
    ).toStrictEqual({ averageLtv: 5000, averageProductsPerOrder: 1, returningRate: 100, total: 4 })
  })
})

describe("filterAdminCustomersByStat", () => {
  const customers = [
    toAdminCustomerListItem(userRow({ id: "one-off" }), { orderCount: 1, totalSpent: 5000 }, undefined),
    toAdminCustomerListItem(userRow({ id: "repeat" }), { orderCount: 2, totalSpent: 20_000 }, undefined),
    toAdminCustomerListItem(userRow({ id: "never" }), undefined, undefined),
  ]

  it("narrows to customers with at least two orders", () => {
    expect(filterAdminCustomersByStat(customers, ADMIN_CUSTOMER_STAT_FILTER.RETURNING).map((row) => row.id)).toStrictEqual(["repeat"])
  })

  it.each([[undefined], [ADMIN_CUSTOMER_STAT_FILTER.TOTAL]])("keeps every customer for the %j filter", (filter) => {
    const result = filterAdminCustomersByStat(customers, filter)

    expect(result).toHaveLength(customers.length)
    expect(result).not.toBe(customers)
  })
})

describe("mapCustomerOrderStats", () => {
  it("keys the aggregates by user id and coerces D1's string sums", () => {
    const stats = mapCustomerOrderStats([{ lastOrderAt: "2024-05-01T10:00:00.000Z", orderCount: "2", totalSpent: "20000", userId: "u1" }])

    expect(stats.get("u1")).toStrictEqual({ lastOrderAt: new Date("2024-05-01T10:00:00.000Z"), orderCount: 2, totalSpent: 20_000 })
  })

  it("keeps a Date value as it came back from the driver", () => {
    const lastOrderAt = new Date(2024, 4, 1)

    expect(mapCustomerOrderStats([{ lastOrderAt, orderCount: 1, totalSpent: 1, userId: "u1" }]).get("u1")?.lastOrderAt).toBe(lastOrderAt)
  })

  it("drops guest order rows that carry no user id", () => {
    expect(mapCustomerOrderStats([{ lastOrderAt: null, orderCount: 1, totalSpent: 1, userId: null }]).size).toBe(0)
  })

  it("leaves lastOrderAt absent when the aggregate has none", () => {
    expect(
      mapCustomerOrderStats([{ lastOrderAt: null, orderCount: 0, totalSpent: 0, userId: "u1" }]).get("u1")?.lastOrderAt,
    ).toBeUndefined()
  })
})

describe("formatAdminCustomerFullAddress", () => {
  it("assembles the postal line between the street and the country", () => {
    expect(
      formatAdminCustomerFullAddress({
        address1: "Krucza 1",
        address2: "m. 4",
        city: "Warszawa",
        countryCode: "PL",
        postalCode: "00-001",
        province: "Mazowieckie",
      }),
    ).toBe("Krucza 1, m. 4, 00-001 Warszawa, Mazowieckie, PL")
  })

  it("omits the parts that are missing", () => {
    expect(
      formatAdminCustomerFullAddress({
        address1: "Krucza 1",
        address2: null,
        city: "Warszawa",
        countryCode: "PL",
        postalCode: null,
        province: null,
      }),
    ).toBe("Krucza 1, Warszawa, PL")
  })

  it("reports nothing when there is no address at all", () => {
    expect(formatAdminCustomerFullAddress(undefined)).toBeUndefined()
  })

  it("reports nothing when every stored address field is blank", () => {
    expect(
      formatAdminCustomerFullAddress({ address1: " ", address2: null, city: "", countryCode: "", postalCode: null, province: null }),
    ).toBeUndefined()
  })
})

describe("relative and absolute dates", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("formats the join date in the requested locale", () => {
    expect(formatShortDate(new Date(2023, 2, 4), "en-US")).toBe("Mar 4, 2023")
  })

  it("accepts a stored date string as well as a Date", () => {
    expect(formatShortDate("2023-03-04T00:00:00.000Z", "en-US")).toContain("2023")
  })

  it.each([
    [30_000, "now"],
    [5 * 60_000, "5 minutes ago"],
    [3 * 3_600_000, "3 hours ago"],
    [2 * 86_400_000, "2 days ago"],
  ])("describes activity %i ms ago as %s", (diffMs, expected) => {
    const lastActiveAt = new Date(NOW.getTime() - diffMs)

    expect(formatAdminCustomerLastActive(lastActiveAt, "en-US")).toBe(expected)
  })

  it("switches to an absolute date once the activity is more than a week old", () => {
    const lastActiveAt = new Date(NOW.getTime() - 8 * 86_400_000)

    expect(formatAdminCustomerLastActive(lastActiveAt, "en-US")).toBe("Jun 7, 2024")
  })

  it("accepts a serialized activity date without changing the relative interval", () => {
    const lastActiveAt = new Date(NOW.getTime() - 5 * 60_000).toISOString()

    expect(formatAdminCustomerLastActive(lastActiveAt, "en-US")).toBe("5 minutes ago")
  })

  it.each([[null], [undefined]])("reports nothing for %j", (lastActiveAt) => {
    expect(formatAdminCustomerLastActive(lastActiveAt, "en-US")).toBeUndefined()
  })
})

describe("resolveAdminCustomerReturningRate", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 100],
    [9, 100],
  ])("reports %i orders as %i percent", (orderCount, expected) => {
    expect(resolveAdminCustomerReturningRate(orderCount)).toBe(expected)
  })
})

describe("resolveAdminCustomerTags", () => {
  it("tags a plain shopper as a customer", () => {
    expect(resolveAdminCustomerTags(userRow(), 0)).toStrictEqual([ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER])
  })

  it("tags an administrator instead of a customer", () => {
    expect(resolveAdminCustomerTags(userRow({ role: ROLES.ADMIN }), 0)).toStrictEqual([ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN])
  })

  it("adds the returning tag from two orders onwards", () => {
    expect(resolveAdminCustomerTags(userRow(), 2)).toContain(ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING)
    expect(resolveAdminCustomerTags(userRow(), 1)).not.toContain(ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING)
  })

  it("adds the verified and banned tags from the account flags", () => {
    const tags = resolveAdminCustomerTags(userRow({ banned: true, emailVerified: true }), 0)

    expect(tags).toContain(ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED)
    expect(tags).toContain(ADMIN_CUSTOMER_DETAIL_TAGS.BANNED)
  })

  it("does not ban a customer whose flag is merely absent", () => {
    expect(resolveAdminCustomerTags(userRow({ banned: null }), 0)).not.toContain(ADMIN_CUSTOMER_DETAIL_TAGS.BANNED)
  })
})

describe("buildAdminCustomerTimeline", () => {
  const createdAt = new Date(2023, 2, 4)

  it("always starts from the account creation event", () => {
    const timeline = buildAdminCustomerTimeline({ createdAt, locale: "en-US", orders: [] })

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ kind: "account_created" })
  })

  it("lists the newest event first", () => {
    const timeline = buildAdminCustomerTimeline({
      createdAt,
      locale: "en-US",
      orders: [
        { createdAt: new Date(2024, 0, 1), currencyCode: "PLN", id: "order-1", total: 12_000 },
        { createdAt: new Date(2024, 5, 1), currencyCode: "PLN", id: "order-2", total: 30_000 },
      ],
    })

    expect(timeline.map((event) => event.kind)).toStrictEqual(["order_placed", "order_placed", "account_created"])
  })

  it("formats each order total as money", () => {
    const [event] = buildAdminCustomerTimeline({
      createdAt,
      locale: "en-US",
      orders: [{ createdAt: new Date(2024, 0, 1), currencyCode: "PLN", id: "order-1", total: 12_000 }],
    })

    expect(event).toMatchObject({ kind: "order_placed", orderId: "order-1" })
    expect(JSON.stringify(event)).toContain("120")
  })

  it("maps the audit actions it recognises and drops the rest", () => {
    const timeline = buildAdminCustomerTimeline({
      auditEvents: [
        { action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: new Date(2024, 1, 1), detail: null, metadata: null },
        { action: AUDIT_LOG_ACTION.AUTH_LOGOUT, createdAt: new Date(2024, 1, 2), detail: null, metadata: null },
        { action: AUDIT_LOG_ACTION.PRODUCT_CREATED, createdAt: new Date(2024, 1, 3), detail: null, metadata: null },
      ],
      createdAt,
      locale: "en-US",
      orders: [],
    })

    expect(timeline.map((event) => event.kind)).toStrictEqual(["signed_out", "signed_in", "account_created"])
  })

  it("reads the cart event details out of the audit metadata", () => {
    const [event] = buildAdminCustomerTimeline({
      auditEvents: [
        {
          action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
          createdAt: new Date(2024, 1, 1),
          detail: null,
          metadata: JSON.stringify({ productTitle: "Onyx earrings", quantity: 3 }),
        },
      ],
      createdAt,
      locale: "en-US",
      orders: [],
    })

    expect(event).toMatchObject({ kind: "cart_item_added", productTitle: "Onyx earrings", quantity: 3 })
  })

  it("falls back to the audit detail column when the metadata is unusable", () => {
    const [event] = buildAdminCustomerTimeline({
      auditEvents: [
        {
          action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
          createdAt: new Date(2024, 1, 1),
          detail: "Silver ring",
          metadata: "{not json",
        },
      ],
      createdAt,
      locale: "en-US",
      orders: [],
    })

    expect(event).toMatchObject({ kind: "cart_item_added", productTitle: "Silver ring", quantity: 1 })
  })

  it("maps the abandoned cart and page view events", () => {
    const timeline = buildAdminCustomerTimeline({
      auditEvents: [
        {
          action: AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED,
          createdAt: new Date(2024, 1, 1),
          detail: null,
          metadata: JSON.stringify({ itemCount: 4 }),
        },
        {
          action: AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED,
          createdAt: new Date(2024, 1, 2),
          detail: null,
          metadata: JSON.stringify({ path: "/products/silver-ring" }),
        },
      ],
      createdAt,
      locale: "en-US",
      orders: [],
    })

    expect(timeline[0]).toMatchObject({ kind: "page_viewed", path: "/products/silver-ring" })
    expect(timeline[1]).toMatchObject({ itemCount: 4, kind: "cart_abandoned" })
  })

  it("leaves no sort key behind on the returned events", () => {
    const [event] = buildAdminCustomerTimeline({ createdAt, locale: "en-US", orders: [] })

    expect(event === undefined ? [] : Object.keys(event)).not.toContain("sortAt")
  })
})

describe("buildAdminCustomerMonthlySpendingSeries", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns one bucket per requested month, ending with the current one", () => {
    const series = buildAdminCustomerMonthlySpendingSeries([], "en-US", 3)

    expect(series.map((point) => point.month)).toStrictEqual(["Apr", "May", "Jun"])
  })

  it("fills the months with no spending with zero", () => {
    const series = buildAdminCustomerMonthlySpendingSeries([{ amount: 12_000, monthKey: "2024-05" }], "en-US", 3)

    expect(series.map((point) => point.amount)).toStrictEqual([0, 12_000, 0])
  })

  it("zero-pads the month key it matches on", () => {
    vi.setSystemTime(new Date(2024, 0, 15))

    const series = buildAdminCustomerMonthlySpendingSeries([{ amount: 500, monthKey: "2024-01" }], "en-US", 1)

    expect(series[0]?.amount).toBe(500)
  })

  it("ignores aggregate rows with no month and coerces D1's string sums", () => {
    const series = buildAdminCustomerMonthlySpendingSeries(
      [
        { amount: "7000", monthKey: "2024-06" },
        { amount: 100, monthKey: null },
      ],
      "en-US",
      1,
    )

    expect(series).toStrictEqual([{ amount: 7000, month: "Jun" }])
  })
})

describe("formatAdminCustomerDetailKpiPrice", () => {
  it("formats a minor-unit amount in the store currency", () => {
    const formatted = formatAdminCustomerDetailKpiPrice(12_000, "pl-PL")

    expect(formatted).toContain("120")
    expect(formatted).toContain("zł")
  })
})

describe("customer order stats coercion", () => {
  it("counts a customer with null aggregates as having ordered nothing", () => {
    const stats = mapCustomerOrderStats([{ lastOrderAt: null, orderCount: null, totalSpent: null, userId: "u1" }])

    expect(stats.get("u1")).toStrictEqual({ lastOrderAt: undefined, orderCount: 0, totalSpent: 0 })
  })
})

describe("audit timeline metadata parsing", () => {
  const createdAt = new Date(2023, 2, 4)

  const timelineFor = (metadata: string | null) =>
    buildAdminCustomerTimeline({
      auditEvents: [{ action: "customer.cart_item_added", createdAt: new Date(2024, 0, 1), detail: "Silver ring", metadata }],
      createdAt,
      locale: "en-US",
      orders: [],
    })

  it("falls back to the audit detail when the metadata is not an object", () => {
    expect(timelineFor("42")[0]).toMatchObject({ kind: "cart_item_added", productTitle: "Silver ring", quantity: 1 })
  })

  it("falls back to the audit detail when the metadata is not valid json", () => {
    expect(timelineFor("{not json")[0]).toMatchObject({ kind: "cart_item_added", productTitle: "Silver ring" })
  })

  it("falls back to the audit detail when there is no metadata at all", () => {
    expect(timelineFor(null)[0]).toMatchObject({ kind: "cart_item_added", productTitle: "Silver ring" })
  })
})

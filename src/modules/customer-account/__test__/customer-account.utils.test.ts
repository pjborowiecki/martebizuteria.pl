import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  formatCustomerAccountRelativeTime,
  groupOrderItemsByOrderId,
  hasCustomerOrderItems,
  mapAuditLogToActivityItem,
  mapCustomerAccountAddressRow,
  mapCustomerOrderDetail,
  mapCustomerOrderSummaryRow,
  matchesCustomerAccountOrderFilter,
  parseUserAgent,
  resolveCustomerAccountOrderFilter,
} from "~/src/modules/customer-account/customer-account.utils"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (src?: string | null) => src ?? "placeholder.svg" }))

import { type Order } from "~/src/modules/order/order.types"

const NOW = new Date(2024, 5, 15, 12, 0, 0)

const FILTER_BUCKET_CASES: [Order["select"]["fulfillmentStatus"], string][] = [
  ["delivered", "delivered"],
  ["shipped", "shipped"],
  ["not_fulfilled", "processing"],
  ["fulfilled", "processing"],
]

const ORDER_ID = "0195b6f4-1111-7000-8000-000000000001"

const itemRow = {
  orderId: ORDER_ID,
  quantity: 2,
  thumbnail: "products/ring.jpg",
  title: "Silver ring",
  total: 24_000,
  variantTitle: "Size S",
}

const orderRow = {
  canceledAt: null,
  createdAt: new Date(2024, 4, 1),
  currencyCode: "PLN",
  deliveredAt: null,
  fulfillmentStatus: "not_fulfilled" as const,
  id: ORDER_ID,
  orderNumber: "MRT-2026-00001",
  shippedAt: null,
  shippingTotal: 1500,
  status: "processing" as const,
  subtotal: 24_000,
  taxTotal: 0,
  total: 25_500,
  trackingNumber: null,
  trackingUrl: null,
}

const ORDER_NUMBERS: ReadonlyMap<string, string> = new Map([[ORDER_ID, "MRT-2026-00001"]])

describe("resolveCustomerAccountOrderFilter", () => {
  it("treats a cancelled order or a cancelled fulfilment as cancelled", () => {
    expect(resolveCustomerAccountOrderFilter("cancelled", "shipped")).toBe("cancelled")
    expect(resolveCustomerAccountOrderFilter("processing", "cancelled")).toBe("cancelled")
  })

  it.each(FILTER_BUCKET_CASES)("maps the fulfilment status %s to the %s bucket", (fulfillmentStatus, expected) => {
    expect(resolveCustomerAccountOrderFilter("processing", fulfillmentStatus)).toBe(expected)
  })
})

describe("matchesCustomerAccountOrderFilter", () => {
  it("keeps every order under the all filter", () => {
    expect(matchesCustomerAccountOrderFilter("all", "cancelled", "cancelled")).toBe(true)
  })

  it("matches only the order's own bucket", () => {
    expect(matchesCustomerAccountOrderFilter("shipped", "processing", "shipped")).toBe(true)
    expect(matchesCustomerAccountOrderFilter("delivered", "processing", "shipped")).toBe(false)
  })
})

describe("mapCustomerOrderSummaryRow", () => {
  it("maps the order and its lines into the summary shape", () => {
    const summary = mapCustomerOrderSummaryRow(orderRow, [itemRow])

    expect(summary).toMatchObject({ filterStatus: "processing", id: ORDER_ID, totalMinorUnits: 25_500 })
    expect(summary.items).toStrictEqual([
      { image: "products/ring.jpg", name: "Silver ring", priceMinorUnits: 24_000, qty: 2, variantTitle: "Size S" },
    ])
  })

  it.each([[null], [""]])("leaves the line image absent when the thumbnail is %j", (thumbnail) => {
    const [item] = mapCustomerOrderSummaryRow(orderRow, [{ ...itemRow, thumbnail }]).items

    expect(item?.image).toBeUndefined()
  })

  it("leaves the variant title absent for a single-variant product", () => {
    const [item] = mapCustomerOrderSummaryRow(orderRow, [{ ...itemRow, variantTitle: null }]).items

    expect(item?.variantTitle).toBeUndefined()
  })
})

describe("mapCustomerAccountAddressRow", () => {
  const addressRow = {
    address1: "Krucza 1",
    address2: "m. 4",
    city: "Warszawa",
    countryCode: "PL",
    firstName: "Anna",
    lastName: "Kowalska",
    phone: "+48123456789",
    postalCode: "00-001",
    province: "Mazowieckie",
  }

  it.each([[null], [undefined]])("reports nothing for %j", (row) => {
    expect(mapCustomerAccountAddressRow(row)).toBeUndefined()
  })

  it("joins the first and last name", () => {
    expect(mapCustomerAccountAddressRow(addressRow)?.name).toBe("Anna Kowalska")
  })

  it("keeps whichever name part is present", () => {
    expect(mapCustomerAccountAddressRow({ ...addressRow, lastName: null })?.name).toBe("Anna")
  })

  it("falls back to the placeholder when the address carries no name", () => {
    expect(mapCustomerAccountAddressRow({ ...addressRow, firstName: null, lastName: "  " })?.name).toBe(EMPTY_VALUE)
  })

  it("normalises the nullable columns to absent", () => {
    const mapped = mapCustomerAccountAddressRow({ ...addressRow, address2: null, phone: null, postalCode: null, province: null })

    expect(mapped?.line2).toBeUndefined()
    expect(mapped?.phone).toBeUndefined()
    expect(mapped?.postalCode).toBeUndefined()
    expect(mapped?.province).toBeUndefined()
  })
})

describe("mapCustomerOrderDetail", () => {
  it("adds the money breakdown and the supplied addresses to the summary", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { paymentProvider: "stripe" })

    expect(detail).toMatchObject({
      paymentProvider: "stripe",
      shippingMinorUnits: 1500,
      subtotalMinorUnits: 24_000,
      taxMinorUnits: 0,
    })
  })

  it("starts the timeline at the order being placed", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, status: "pending" }, [itemRow], {})

    expect(detail.timeline).toStrictEqual([{ date: orderRow.createdAt, event: "placed" }])
  })

  it("confirms an order the moment it leaves the pending state", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], {})

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["placed", "confirmed"])
  })

  it("lists the newest timeline entry first", () => {
    const detail = mapCustomerOrderDetail(
      { ...orderRow, deliveredAt: new Date(2024, 4, 5), shippedAt: new Date(2024, 4, 3) },
      [itemRow],
      {},
    )

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["delivered", "shipped", "placed", "confirmed"])
  })

  it("records a cancellation on the timeline", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, canceledAt: new Date(2024, 4, 2), status: "cancelled" }, [itemRow], {})

    expect(detail.timeline.map((entry) => entry.event)).toContain("cancelled")
    expect(detail.filterStatus).toBe("cancelled")
  })

  it("normalises the nullable tracking and date columns to absent", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], {})

    expect(detail.trackingNumber).toBeUndefined()
    expect(detail.trackingUrl).toBeUndefined()
    expect(detail.shippedAt).toBeUndefined()
    expect(detail.deliveredAt).toBeUndefined()
  })
})

describe("mapAuditLogToActivityItem", () => {
  const auditRow = { action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: new Date(2024, 4, 1), detail: null, metadata: null }

  it.each([
    [AUDIT_LOG_ACTION.AUTH_LOGIN, "loginSuccess"],
    [AUDIT_LOG_ACTION.AUTH_LOGOUT, "logout"],
    [AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, "loginFailed"],
  ])("maps the auth action %s to %s", (action, actionKey) => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action })).toStrictEqual({ actionKey, createdAt: auditRow.createdAt, params: {} })
  })

  it("drops an action the customer timeline does not show", () => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.PRODUCT_CREATED })).toBeUndefined()
  })

  it("names the cart item from the metadata, falling back to the detail column", () => {
    expect(
      mapAuditLogToActivityItem({
        ...auditRow,
        action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
        metadata: JSON.stringify({ title: "Silver ring" }),
      }),
    ).toMatchObject({ actionKey: "cartItemAdded", params: { item: "Silver ring" } })

    expect(
      mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED, detail: "Gold ring" }),
    ).toMatchObject({ params: { item: "Gold ring" } })
  })

  it("drops a cart event that names no product", () => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED })).toBeUndefined()
  })

  it.each([
    [AUDIT_LOG_ACTION.ORDER_PLACED, "orderPlaced"],
    [AUDIT_LOG_ACTION.ORDER_SHIPPED, "orderShipped"],
    [AUDIT_LOG_ACTION.ORDER_RELEASED, "orderDelivered"],
  ])("maps the order action %s to %s with the order number", (action, actionKey) => {
    expect(
      mapAuditLogToActivityItem({ ...auditRow, action, metadata: JSON.stringify({ orderId: ORDER_ID }) }, ORDER_NUMBERS),
    ).toMatchObject({
      actionKey,
      params: { id: "MRT-2026-00001" },
    })
  })

  it("drops an order event whose order is not among the customer's own", () => {
    expect(
      mapAuditLogToActivityItem(
        { ...auditRow, action: AUDIT_LOG_ACTION.ORDER_PLACED, metadata: JSON.stringify({ orderId: "someone-else" }) },
        ORDER_NUMBERS,
      ),
    ).toBeUndefined()
  })

  it.each([AUDIT_LOG_ACTION.ORDER_PLACED, AUDIT_LOG_ACTION.ORDER_SHIPPED, AUDIT_LOG_ACTION.ORDER_RELEASED])(
    "drops the order event %s when it identifies no order",
    (action) => {
      expect(mapAuditLogToActivityItem({ ...auditRow, action })).toBeUndefined()
    },
  )

  it("does not invent an order id from an empty metadata field", () => {
    expect(
      mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.ORDER_SHIPPED, metadata: JSON.stringify({ orderId: "" }) }),
    ).toBeUndefined()
  })

  it.each([["{not json"], ['["silver"]']])("drops an order event with unusable metadata %j", (metadata) => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.ORDER_PLACED, metadata }, ORDER_NUMBERS)).toBeUndefined()
  })
})

describe("parseUserAgent", () => {
  it.each([[null], [""]])("reports an unknown device for %j", (userAgent) => {
    expect(parseUserAgent(userAgent)).toStrictEqual({ browser: "Unknown browser", device: "Unknown device", deviceType: "unknown" })
  })

  it("recognises an iPhone as a mobile Safari session", () => {
    expect(parseUserAgent("Mozilla/5.0 (iphone) safari")).toStrictEqual({ browser: "Safari", device: "iPhone", deviceType: "mobile" })
  })

  it("recognises an iPad as a tablet", () => {
    expect(parseUserAgent("Mozilla/5.0 (ipad) safari").deviceType).toBe("tablet")
  })

  it("recognises android as mobile", () => {
    expect(parseUserAgent("Mozilla/5.0 (android) chrome")).toStrictEqual({ browser: "Chrome", device: "Android", deviceType: "mobile" })
  })

  it.each([
    ["macintosh chrome", "Mac"],
    ["windows firefox", "Windows"],
  ])("recognises the desktop agent %j as %s", (userAgent, device) => {
    expect(parseUserAgent(userAgent)).toMatchObject({ device, deviceType: "desktop" })
  })

  it("prefers Chrome over Safari when the agent claims both", () => {
    expect(parseUserAgent("macintosh chrome safari").browser).toBe("Chrome")
  })

  it("falls back to generic labels for an agent it does not recognise", () => {
    expect(parseUserAgent("curl/8.0")).toStrictEqual({ browser: "Browser", device: "Device", deviceType: "desktop" })
  })
})

describe("groupOrderItemsByOrderId", () => {
  it("groups the lines of each order together in row order", () => {
    const grouped = groupOrderItemsByOrderId([
      itemRow,
      { ...itemRow, title: "Gold ring" },
      { ...itemRow, orderId: "order-2", title: "Bracelet" },
    ])

    expect(grouped.get(ORDER_ID)?.map((item) => item.name)).toStrictEqual(["Silver ring", "Gold ring"])
    expect(grouped.get("order-2")).toHaveLength(1)
  })

  it("is empty when there are no lines", () => {
    expect(groupOrderItemsByOrderId([]).size).toBe(0)
  })
})

describe("hasCustomerOrderItems", () => {
  it("distinguishes an order with lines from one without", () => {
    expect(hasCustomerOrderItems([{ name: "Silver ring", priceMinorUnits: 1, qty: 1 }])).toBe(true)
    expect(hasCustomerOrderItems([])).toBe(false)
  })
})

describe("formatCustomerAccountRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [30_000, "now"],
    [5 * 60_000, "5 minutes ago"],
    [3 * 3_600_000, "3 hours ago"],
    [2 * 86_400_000, "2 days ago"],
  ])("describes %i ms ago as %s", (diffMs, expected) => {
    const at = new Date(NOW.getTime() - diffMs)

    expect(formatCustomerAccountRelativeTime(at, "en-US")).toBe(expected)
  })

  it("switches to an absolute date beyond a week", () => {
    const at = new Date(NOW.getTime() - 8 * 86_400_000)

    expect(formatCustomerAccountRelativeTime(at, "en-US")).toBe("Jun 7, 2024")
  })
})

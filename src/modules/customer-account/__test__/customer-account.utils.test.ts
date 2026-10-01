import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  formatCustomerAccountRelativeTime,
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
  handle: "silver-ring",
  id: "item-1",
  orderId: ORDER_ID,
  quantity: 2,
  thumbnail: "products/ring.jpg",
  title: "Silver ring",
  total: 24_000,
  unitPrice: 12_000,
  variantTitle: "Size S",
}

const paymentRow = {
  provider: "stripe",
  refundedAmount: 0,
  refundedAt: null,
  status: "succeeded" as const,
  updatedAt: new Date(2024, 4, 1, 12, 5),
}

const orderRow = {
  billingCompanyName: null,
  billingNip: null,
  canceledAt: null,
  createdAt: new Date(2024, 4, 1),
  currencyCode: "PLN",
  customerNote: null,
  deliveredAt: null,
  discountTotal: 0,
  fulfillmentStatus: "not_fulfilled" as const,
  id: ORDER_ID,
  lockerId: null,
  orderNumber: "MRT-2026-00001",
  shippedAt: null,
  shippingTotal: 1500,
  status: "processing" as const,
  subtotal: 24_000,
  taxBasisPoints: 2300,
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
      {
        handle: "silver-ring",
        id: "item-1",
        image: "products/ring.jpg",
        lineTotalMinorUnits: 24_000,
        name: "Silver ring",
        qty: 2,
        unitPriceMinorUnits: 12_000,
        variantTitle: "Size S",
      },
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
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: paymentRow })

    expect(detail).toMatchObject({
      discountMinorUnits: 0,
      paymentProvider: "stripe",
      shippingMinorUnits: 1500,
      subtotalMinorUnits: 24_000,
      taxBasisPoints: 2300,
      taxMinorUnits: 0,
    })
  })

  it("counts the pieces an order holds, not just its lines", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow, { ...itemRow, id: "item-2", quantity: 3 }], {})

    expect(detail.itemCount).toBe(5)
  })

  it("derives a unit price for a historical line that stored none", () => {
    const detail = mapCustomerOrderDetail(orderRow, [{ ...itemRow, unitPrice: undefined }], {})

    expect(detail.items[0]?.unitPriceMinorUnits).toBe(12_000)
  })

  it("starts the timeline at the order being placed", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, status: "pending" }, [itemRow], {})

    expect(detail.timeline).toStrictEqual([{ date: orderRow.createdAt, event: "placed" }])
  })

  it("confirms an order from the payment that went through", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: paymentRow })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["confirmed", "placed"])
  })

  it("leaves an order with no successful payment unconfirmed", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: { ...paymentRow, status: "pending" } })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["placed"])
  })

  it("lists the newest timeline entry first", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, deliveredAt: new Date(2024, 4, 5), shippedAt: new Date(2024, 4, 3) }, [itemRow], {
      payment: paymentRow,
    })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["delivered", "shipped", "confirmed", "placed"])
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

  it("names the cart item from the metadata the recorder writes", () => {
    expect(
      mapAuditLogToActivityItem({
        ...auditRow,
        action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
        metadata: JSON.stringify({ productTitle: "Silver ring", quantity: 2 }),
      }),
    ).toMatchObject({ actionKey: "cartItemAdded", params: { item: "Silver ring" } })
  })

  it("falls back to the detail column for a row written without metadata", () => {
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

  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      { browser: "Chrome", device: "Mac", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      { browser: "Safari", device: "iPhone", deviceType: "mobile" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      { browser: "Chrome", device: "Android", deviceType: "mobile" },
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1",
      { browser: "Safari", device: "iPad", deviceType: "tablet" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      { browser: "Chrome", device: "Android", deviceType: "tablet" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
      { browser: "Edge", device: "Windows", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
      { browser: "Firefox", device: "Windows", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1",
      { browser: "Chrome", device: "iPhone", deviceType: "mobile" },
    ],
  ])("names the device and browser behind a real user agent", (userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toStrictEqual(expected)
  })

  it("prefers Edge over the Chrome its agent also claims", () => {
    expect(parseUserAgent("Windows NT 10.0 Chrome/124 Safari/537.36 Edg/124").browser).toBe("Edge")
  })

  it("prefers Chrome over the Safari its agent also claims", () => {
    expect(parseUserAgent("Macintosh Chrome/124 Safari/537.36").browser).toBe("Chrome")
  })

  it("falls back to generic labels for an agent it does not recognise", () => {
    expect(parseUserAgent("curl/8.0")).toStrictEqual({ browser: "Browser", device: "Device", deviceType: "desktop" })
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

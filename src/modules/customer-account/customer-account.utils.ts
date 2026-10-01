import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { type Order } from "~/src/modules/order/order.types"

import { getProductImageUrl } from "~/src/lib/image"

export const resolveCustomerAccountOrderFilter = (
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): CustomerAccountOrderFilter => {
  if (status === "cancelled" || fulfillmentStatus === "cancelled") {
    return "cancelled"
  }

  if (fulfillmentStatus === "delivered") {
    return "delivered"
  }

  if (fulfillmentStatus === "shipped") {
    return "shipped"
  }

  return "processing"
}

export const matchesCustomerAccountOrderFilter = (
  filter: CustomerAccountOrderFilter,
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): boolean => {
  if (filter === "all") {
    return true
  }

  return resolveCustomerAccountOrderFilter(status, fulfillmentStatus) === filter
}

const mapOrderItemRow = (row: {
  readonly quantity: number
  readonly thumbnail: string | null
  readonly title: string
  readonly total: number
  readonly variantTitle: string | null
}): CustomerAccount["orderItem"] => ({
  image: row.thumbnail === null || row.thumbnail === "" ? undefined : getProductImageUrl(row.thumbnail),
  name: row.title,
  priceMinorUnits: row.total,
  qty: row.quantity,
  variantTitle: row.variantTitle ?? undefined,
})

export const mapCustomerOrderSummaryRow = (
  orderRow: {
    readonly createdAt: Date
    readonly currencyCode: string
    readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
    readonly id: string
    readonly orderNumber: string
    readonly status: Order["select"]["status"]
    readonly total: number
  },
  items: readonly {
    readonly quantity: number
    readonly thumbnail: string | null
    readonly title: string
    readonly total: number
    readonly variantTitle: string | null
  }[],
): CustomerAccount["orderSummary"] => ({
  createdAt: orderRow.createdAt,
  currencyCode: orderRow.currencyCode,
  filterStatus: resolveCustomerAccountOrderFilter(orderRow.status, orderRow.fulfillmentStatus),
  fulfillmentStatus: orderRow.fulfillmentStatus,
  id: orderRow.id,
  items: items.map((item) => mapOrderItemRow(item)),
  orderNumber: orderRow.orderNumber,
  status: orderRow.status,
  totalMinorUnits: orderRow.total,
})

export const mapCustomerAccountAddressRow = (
  row:
    | {
        readonly address1: string
        readonly address2: string | null
        readonly city: string
        readonly countryCode: string
        readonly firstName: string | null
        readonly lastName: string | null
        readonly phone: string | null
        readonly postalCode: string | null
        readonly province: string | null
      }
    | null
    | undefined,
): CustomerAccount["orderAddress"] | undefined => {
  if (row === undefined || row === null) {
    return undefined
  }

  const name = [row.firstName, row.lastName]
    .filter((part) => part !== null && part.trim() !== "")
    .join(" ")
    .trim()
  return {
    city: row.city,
    countryCode: row.countryCode,
    line1: row.address1,
    line2: row.address2 ?? undefined,
    name: name === "" ? EMPTY_VALUE : name,
    phone: row.phone ?? undefined,
    postalCode: row.postalCode ?? undefined,
    province: row.province ?? undefined,
  }
}

const buildOrderTimeline = (orderRow: {
  readonly canceledAt: Date | null
  readonly createdAt: Date
  readonly deliveredAt: Date | null
  readonly shippedAt: Date | null
  readonly status: Order["select"]["status"]
}): CustomerAccount["orderTimelineEntry"][] => {
  const timeline: CustomerAccount["orderTimelineEntry"][] = [
    {
      date: orderRow.createdAt,
      event: "placed",
    },
  ]

  if (orderRow.status !== "pending") {
    timeline.push({
      date: orderRow.createdAt,
      event: "confirmed",
    })
  }

  if (orderRow.shippedAt !== null) {
    timeline.push({
      date: orderRow.shippedAt,
      event: "shipped",
    })
  }

  if (orderRow.deliveredAt !== null) {
    timeline.push({
      date: orderRow.deliveredAt,
      event: "delivered",
    })
  }

  if (orderRow.canceledAt !== null) {
    timeline.push({
      date: orderRow.canceledAt,
      event: "cancelled",
    })
  }

  return timeline.toSorted((left, right) => right.date.getTime() - left.date.getTime())
}

export const mapCustomerOrderDetail = (
  orderRow: {
    readonly canceledAt: Date | null
    readonly createdAt: Date
    readonly currencyCode: string
    readonly deliveredAt: Date | null
    readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
    readonly id: string
    readonly orderNumber: string
    readonly shippedAt: Date | null
    readonly shippingTotal: number
    readonly status: Order["select"]["status"]
    readonly subtotal: number
    readonly taxTotal: number
    readonly total: number
    readonly trackingNumber: string | null
    readonly trackingUrl: string | null
  },
  items: readonly {
    readonly quantity: number
    readonly thumbnail: string | null
    readonly title: string
    readonly total: number
    readonly variantTitle: string | null
  }[],
  options: {
    readonly billingAddress?: CustomerAccount["orderAddress"] | undefined
    readonly paymentProvider?: string | undefined
    readonly shippingAddress?: CustomerAccount["orderAddress"] | undefined
  },
): CustomerAccount["orderDetail"] => {
  const summary = mapCustomerOrderSummaryRow(orderRow, items)

  return {
    ...summary,
    billingAddress: options.billingAddress,
    deliveredAt: orderRow.deliveredAt ?? undefined,
    paymentProvider: options.paymentProvider,
    shippedAt: orderRow.shippedAt ?? undefined,
    shippingAddress: options.shippingAddress,
    shippingMinorUnits: orderRow.shippingTotal,
    subtotalMinorUnits: orderRow.subtotal,
    taxMinorUnits: orderRow.taxTotal,
    timeline: buildOrderTimeline(orderRow),
    trackingNumber: orderRow.trackingNumber ?? undefined,
    trackingUrl: orderRow.trackingUrl ?? undefined,
  }
}

export const mapAuditLogToActivityItem = (
  row: {
    readonly action: string
    readonly createdAt: Date
    readonly detail: string | null
    readonly metadata: string | null
    readonly resourceId?: string | null | undefined
  },
  orderNumberByOrderId: ReadonlyMap<string, string> = new Map(),
): CustomerAccount["activityItem"] | undefined => {
  const metadata = parseActivityMetadata(row.metadata)
  const metadataOrderId = typeof metadata["orderId"] === "string" ? metadata["orderId"].trim() : ""
  const referencedOrderId = metadataOrderId === "" ? (row.resourceId ?? "") : metadataOrderId
  const orderId = referencedOrderId === "" ? undefined : orderNumberByOrderId.get(referencedOrderId)
  switch (row.action) {
    case AUDIT_LOG_ACTION.AUTH_LOGIN: {
      return {
        actionKey: "loginSuccess",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.AUTH_LOGOUT: {
      return {
        actionKey: "logout",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED: {
      return {
        actionKey: "loginFailed",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED: {
      const item = typeof metadata["title"] === "string" ? metadata["title"] : (row.detail ?? "")

      return item === ""
        ? undefined
        : {
            actionKey: "cartItemAdded",
            createdAt: row.createdAt,
            params: {
              item,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_PLACED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderPlaced",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_SHIPPED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderShipped",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_RELEASED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderDelivered",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    default: {
      return undefined
    }
  }
}

const isActivityMetadataRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseActivityMetadata = (raw: string | null): Record<string, unknown> => {
  if (raw === null || raw === "") {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    return isActivityMetadataRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const resolveBrowserName = (agent: string): string => {
  if (/chrome|crios/u.test(agent)) {
    return "Chrome"
  }

  if (/safari/u.test(agent)) {
    return "Safari"
  }

  if (/firefox/u.test(agent)) {
    return "Firefox"
  }

  if (/edg/u.test(agent)) {
    return "Edge"
  }

  return "Browser"
}

const resolveDeviceName = (agent: string): string => {
  if (/iphone/u.test(agent)) {
    return "iPhone"
  }

  if (/ipad/u.test(agent)) {
    return "iPad"
  }

  if (/android/u.test(agent)) {
    return "Android"
  }

  if (/macintosh|mac os x/u.test(agent)) {
    return "Mac"
  }

  if (/windows/u.test(agent)) {
    return "Windows"
  }

  return "Device"
}

export const parseUserAgent = (
  userAgent: string | null = "",
): {
  readonly browser: string
  readonly device: string
  readonly deviceType: "desktop" | "mobile" | "tablet" | "unknown"
} => {
  if (userAgent === null || userAgent === "") {
    return {
      browser: "Unknown browser",
      device: "Unknown device",
      deviceType: "unknown",
    }
  }

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop"
  if (/ipad|tablet/u.test(userAgent)) {
    deviceType = "tablet"
  } else if (/mobile|iphone|android/u.test(userAgent)) {
    deviceType = "mobile"
  }

  return {
    browser: resolveBrowserName(userAgent),
    device: resolveDeviceName(userAgent),
    deviceType,
  }
}

export const groupOrderItemsByOrderId = (
  rows: readonly {
    readonly orderId: string
    readonly quantity: number
    readonly thumbnail: string | null
    readonly title: string
    readonly total: number
    readonly variantTitle: string | null
  }[],
): Map<string, CustomerAccount["orderItem"][]> => {
  const grouped = new Map<string, CustomerAccount["orderItem"][]>()
  for (const row of rows) {
    const current = grouped.get(row.orderId) ?? []
    current.push(mapOrderItemRow(row))
    grouped.set(row.orderId, current)
  }

  return grouped
}

export const hasCustomerOrderItems = (items: readonly CustomerAccount["orderItem"][]): boolean => items.length > 0

export const formatCustomerAccountRelativeTime = (date: Date, locale: string): string => {
  const diffMs = Date.now() - date.getTime()
  if (diffMs < RELATIVE_TIME_DIVISOR_MS.minute) {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(0, "second")
  }

  if (diffMs < RELATIVE_TIME_DIVISOR_MS.hour) {
    const minutes = Math.floor(diffMs / RELATIVE_TIME_DIVISOR_MS.minute)

    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-minutes, "minute")
  }

  if (diffMs < RELATIVE_TIME_DIVISOR_MS.day) {
    const hours = Math.floor(diffMs / RELATIVE_TIME_DIVISOR_MS.hour)

    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-hours, "hour")
  }

  if (diffMs < RELATIVE_TIME_DIVISOR_MS.day * RELATIVE_TIME_WEEK_DAYS) {
    const days = Math.floor(diffMs / RELATIVE_TIME_DIVISOR_MS.day)

    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-days, "day")
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date)
}

const RELATIVE_TIME_DIVISOR_MS = {
  day: 86_400_000,
  hour: 3_600_000,
  minute: 60_000,
  second: 1000,
} as const

const RELATIVE_TIME_WEEK_DAYS = 7

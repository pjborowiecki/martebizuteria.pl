import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { type Order } from "~/src/modules/order/order.types"
import { type Payment } from "~/src/modules/payment/payment.types"

import { getProductImageUrl } from "~/src/lib/image"

const NO_ITEMS = 0

const SINGLE_ITEM = 1

export const resolveCustomerAccountOrderFilter = (
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): CustomerAccountOrderFilter => {
  if (status === "refunded") {
    return "refunded"
  }

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

export interface CustomerOrderItemRow {
  readonly handle?: string | null | undefined
  readonly id: string
  readonly quantity: number
  readonly thumbnail: string | null
  readonly title: string
  readonly total: number
  readonly unitPrice?: number | undefined
  readonly variantTitle: string | null
}

const mapOrderItemRow = (row: CustomerOrderItemRow): CustomerAccount["orderItem"] => ({
  handle: row.handle ?? undefined,
  id: row.id,
  image: row.thumbnail === null || row.thumbnail === "" ? undefined : getProductImageUrl(row.thumbnail),
  lineTotalMinorUnits: row.total,
  name: row.title,
  qty: row.quantity,
  unitPriceMinorUnits: row.unitPrice ?? Math.round(row.total / Math.max(row.quantity, SINGLE_ITEM)),
  variantTitle: row.variantTitle ?? undefined,
})

const countOrderItems = (items: readonly CustomerOrderItemRow[]): number => items.reduce((total, item) => total + item.quantity, NO_ITEMS)

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
  items: readonly CustomerOrderItemRow[],
): CustomerAccount["orderSummary"] => ({
  createdAt: orderRow.createdAt,
  currencyCode: orderRow.currencyCode,
  filterStatus: resolveCustomerAccountOrderFilter(orderRow.status, orderRow.fulfillmentStatus),
  fulfillmentStatus: orderRow.fulfillmentStatus,
  id: orderRow.id,
  itemCount: countOrderItems(items),
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

const buildOrderTimeline = (
  orderRow: {
    readonly canceledAt: Date | null
    readonly createdAt: Date
    readonly deliveredAt: Date | null
    readonly shippedAt: Date | null
    readonly status: Order["select"]["status"]
  },
  payment: CustomerOrderPaymentRow | null | undefined,
): CustomerAccount["orderTimelineEntry"][] => {
  const timeline: CustomerAccount["orderTimelineEntry"][] = [
    {
      date: orderRow.createdAt,
      event: "placed",
    },
  ]

  const paidAt = payment?.status === "succeeded" || payment?.status === "refunded" ? payment.updatedAt : undefined
  if (paidAt !== undefined) {
    timeline.push({
      date: paidAt,
      event: "confirmed",
    })
  }

  if (payment?.refundedAt !== null && payment?.refundedAt !== undefined) {
    timeline.push({
      date: payment.refundedAt,
      event: "refunded",
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

export interface CustomerOrderPaymentRow {
  readonly provider: string
  readonly refundedAmount: number
  readonly refundedAt: Date | null
  readonly status: Payment["select"]["status"]
  readonly updatedAt: Date
}

const mapOrderRefund = (payment: CustomerOrderPaymentRow | null | undefined): CustomerAccount["orderRefund"] | undefined => {
  if (payment === null || payment === undefined || payment.refundedAmount <= NO_ITEMS) {
    return undefined
  }

  return {
    amountMinorUnits: payment.refundedAmount,
    refundedAt: payment.refundedAt ?? undefined,
  }
}

export const mapCustomerOrderDetail = (
  orderRow: {
    readonly billingCompanyName: string | null
    readonly billingNip: string | null
    readonly canceledAt: Date | null
    readonly createdAt: Date
    readonly currencyCode: string
    readonly customerNote: string | null
    readonly deliveredAt: Date | null
    readonly discountTotal: number
    readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
    readonly id: string
    readonly lockerId: string | null
    readonly orderNumber: string
    readonly shippedAt: Date | null
    readonly shippingTotal: number
    readonly status: Order["select"]["status"]
    readonly subtotal: number
    readonly taxBasisPoints: number
    readonly taxTotal: number
    readonly total: number
    readonly trackingNumber: string | null
    readonly trackingUrl: string | null
  },
  items: readonly CustomerOrderItemRow[],
  options: {
    readonly billingAddress?: CustomerAccount["orderAddress"] | undefined
    readonly deliveryMethodName?: string | undefined
    readonly deliveryMethodType?: (typeof deliveryMethod.$inferSelect)["type"] | undefined
    readonly payment?: CustomerOrderPaymentRow | null | undefined
    readonly shippingAddress?: CustomerAccount["orderAddress"] | undefined
  },
): CustomerAccount["orderDetail"] => {
  const summary = mapCustomerOrderSummaryRow(orderRow, items)

  return {
    ...summary,
    billingAddress: options.billingAddress,
    billingCompanyName: orderRow.billingCompanyName ?? undefined,
    billingNip: orderRow.billingNip ?? undefined,
    customerNote: orderRow.customerNote ?? undefined,
    deliveredAt: orderRow.deliveredAt ?? undefined,
    deliveryMethodName: options.deliveryMethodName,
    discountMinorUnits: orderRow.discountTotal,
    lockerId: options.deliveryMethodType === "locker" ? (orderRow.lockerId ?? undefined) : undefined,
    paymentProvider: options.payment?.provider,
    refund: mapOrderRefund(options.payment),
    shippedAt: orderRow.shippedAt ?? undefined,
    shippingAddress: options.shippingAddress,
    shippingMinorUnits: orderRow.shippingTotal,
    subtotalMinorUnits: orderRow.subtotal,
    taxBasisPoints: orderRow.taxBasisPoints,
    taxMinorUnits: orderRow.taxTotal,
    timeline: buildOrderTimeline(orderRow, options.payment),
    trackingNumber: orderRow.trackingNumber ?? undefined,
    trackingUrl: orderRow.trackingUrl ?? undefined,
  }
}

export const mapOrderAddressSnapshotRow = (
  row:
    | {
        readonly address1: string
        readonly address2: string | null
        readonly city: string
        readonly countryCode: string
        readonly firstName: string
        readonly lastName: string
        readonly phone: string | null
        readonly postalCode: string | null
        readonly province: string | null
      }
    | undefined,
): CustomerAccount["orderAddress"] | undefined => mapCustomerAccountAddressRow(row)

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

const BROWSER_PATTERNS = [
  ["Edge", /edg(?:e|a|ios)?\//u],
  ["Opera", /opr\/|opera/u],
  ["Samsung Internet", /samsungbrowser/u],
  ["Chrome", /chrome|crios|chromium/u],
  ["Firefox", /firefox|fxios/u],
  ["Safari", /safari/u],
] as const

const DEVICE_PATTERNS = [
  ["iPhone", /iphone/u],
  ["iPad", /ipad/u],
  ["Android", /android/u],
  ["Mac", /macintosh|mac os x/u],
  ["Windows", /windows/u],
  ["Linux", /linux|cros/u],
] as const

const resolveBrowserName = (agent: string): string => BROWSER_PATTERNS.find(([, pattern]) => pattern.test(agent))?.[0] ?? "Browser"

const resolveDeviceName = (agent: string): string => DEVICE_PATTERNS.find(([, pattern]) => pattern.test(agent))?.[0] ?? "Device"

const resolveDeviceType = (agent: string): "desktop" | "mobile" | "tablet" => {
  if (/ipad|tablet|(?:android(?!.*mobile))/u.test(agent)) {
    return "tablet"
  }

  return /mobile|iphone|android|iemobile/u.test(agent) ? "mobile" : "desktop"
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

  const agent = userAgent.toLowerCase()

  return {
    browser: resolveBrowserName(agent),
    device: resolveDeviceName(agent),
    deviceType: resolveDeviceType(agent),
  }
}

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

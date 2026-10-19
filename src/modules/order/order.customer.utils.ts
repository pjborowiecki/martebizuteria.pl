import { parseInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"

import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { type CustomerAccountOrderFilter, type CustomerAccountOrderStatus } from "~/src/modules/order/order.constants"
import { resolveAdminOrderFulfillmentUiKey, resolveOrderTrackingUrl } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"
import { type Payment } from "~/src/modules/payment/payment.types"

import { getProductImageUrl } from "~/src/lib/image"

const NO_ITEMS = 0

const SINGLE_ITEM = 1

export const resolveCustomerAccountOrderStatus = (
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): CustomerAccountOrderStatus => (status === "refunded" ? "refunded" : resolveAdminOrderFulfillmentUiKey(status, fulfillmentStatus))

export const matchesCustomerAccountOrderFilter = (
  filter: CustomerAccountOrderFilter,
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): boolean => {
  if (filter === "all") {
    return true
  }

  return resolveCustomerAccountOrderStatus(status, fulfillmentStatus) === filter
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

const mapOrderItemRow = (row: CustomerOrderItemRow): Order["customerOrderItem"] => ({
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
): Order["customerOrderSummary"] => ({
  createdAt: orderRow.createdAt,
  currencyCode: orderRow.currencyCode,
  filterStatus: resolveCustomerAccountOrderStatus(orderRow.status, orderRow.fulfillmentStatus),
  fulfillmentStatus: orderRow.fulfillmentStatus,
  id: orderRow.id,
  itemCount: countOrderItems(items),
  items: items.map((item) => mapOrderItemRow(item)),
  orderNumber: orderRow.orderNumber,
  status: orderRow.status,
  totalMinorUnits: orderRow.total,
})

const buildOrderTimeline = (
  orderRow: {
    readonly canceledAt: Date | null
    readonly createdAt: Date
    readonly deliveredAt: Date | null
    readonly fulfillmentStartedAt: Date | null
    readonly shippedAt: Date | null
    readonly status: Order["select"]["status"]
  },
  payment: CustomerOrderPaymentRow | null | undefined,
): Order["customerOrderTimelineEntry"][] => {
  const timeline: Order["customerOrderTimelineEntry"][] = [
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

  if (orderRow.fulfillmentStartedAt !== null) {
    timeline.push({
      date: orderRow.fulfillmentStartedAt,
      event: "processing",
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

const mapOrderRefund = (payment: CustomerOrderPaymentRow | null | undefined): Order["customerOrderRefund"] | undefined => {
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
    readonly fulfillmentStartedAt: Date | null
    readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
    readonly id: string
    readonly lockerId: string | null
    readonly lockerPoint: string | null
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
    readonly billingAddress?: Order["customerOrderAddress"] | undefined
    readonly deliveryCourierCode?: string | undefined
    readonly deliveryMethodName?: string | undefined
    readonly deliveryMethodType?: (typeof deliveryMethod.$inferSelect)["type"] | undefined
    readonly payment?: CustomerOrderPaymentRow | null | undefined
    readonly shippingAddress?: Order["customerOrderAddress"] | undefined
  },
): Order["customerOrderDetail"] => {
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
    lockerPoint: options.deliveryMethodType === "locker" ? parseInpostLockerPoint(orderRow.lockerPoint) : undefined,
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
    trackingUrl: resolveOrderTrackingUrl({
      courierCode: options.deliveryCourierCode,
      deliveryType: options.deliveryMethodType,
      trackingNumber: orderRow.trackingNumber,
      trackingUrl: orderRow.trackingUrl,
    }),
  }
}

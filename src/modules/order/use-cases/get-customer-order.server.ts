import { parseInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"

import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { type CustomerOrderItemRow, type Order } from "~/src/modules/order/order.types"
import { resolveOrderTrackingUrl } from "~/src/modules/order/order.utils"
import { mapCustomerOrderSummaryRow } from "~/src/modules/order/use-cases/list-customer-orders.server"
import { type Payment } from "~/src/modules/payment/payment.types"

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

const NO_ITEMS = 0

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

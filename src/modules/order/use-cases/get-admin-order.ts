import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  type AdminOrderCustomerStats,
  getAdminOrderCustomerStats,
  getAdminOrderDetailRow,
  getAdminOrderItemRows,
  getAdminOrderTimelineRows,
} from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import {
  buildAdminOrderDetailCustomer,
  buildAdminOrderFulfillmentSteps,
  formatAdminOrderDisplayId,
  mapAdminOrderDetailAddress,
  mapAdminOrderDetailItem,
  mapAdminOrderTimeline,
  resolveAdminOrderDetailTags,
  resolveAdminOrderDispute,
} from "~/src/modules/order/order.detail.utils"
import { resolveAdminOrderFulfillmentUiKey, resolveAdminOrderPaymentUiKey } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

type AdminOrderDetailRow = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetailRow>>>

type AdminOrderTimelineRows = Awaited<ReturnType<typeof getAdminOrderTimelineRows>>

const GUEST_CUSTOMER_STATS: AdminOrderCustomerStats = {
  orderCount: 0,
  totalSpent: 0,
}

const resolveFulfillmentStartedAt = (timelineRows: AdminOrderTimelineRows): Date | undefined =>
  timelineRows.findLast((row) => row.action === AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED)?.createdAt

const buildAdminOrderDetail = ({
  customerStats,
  itemRows,
  orderRow,
  timelineRows,
}: BuildAdminOrderDetailInput): Order["adminOrderDetail"] => {
  const dispute = resolveAdminOrderDispute(orderRow.metadata)
  const customerNote = orderRow.customerNote?.trim()
  const { deliveryMethod } = orderRow
  const paymentRow = orderRow.payment
  const billingAddressId = orderRow.checkout?.billingAddressId ?? undefined

  return {
    billingAddress: mapAdminOrderDetailAddress(orderRow.checkout?.billingAddress),
    billingSameAsShipping: billingAddressId !== undefined && billingAddressId === orderRow.checkout?.shippingAddressId,
    canceledAt: orderRow.canceledAt ?? undefined,
    createdAt: orderRow.createdAt,
    currencyCode: orderRow.currencyCode,
    customer: buildAdminOrderDetailCustomer({
      email: orderRow.email,
      name: orderRow.user?.name,
      orderCount: customerStats.orderCount,
      phone: orderRow.user?.phone,
      totalSpent: customerStats.totalSpent,
      userId: orderRow.userId,
    }),
    customerNote: customerNote === undefined || customerNote === "" ? undefined : customerNote,
    deliveredAt: orderRow.deliveredAt ?? undefined,
    delivery:
      deliveryMethod === null
        ? undefined
        : {
            courierName: deliveryMethod.courier.name,
            lockerId: orderRow.lockerId ?? undefined,
            methodName: deliveryMethod.name,
            type: deliveryMethod.type,
          },
    discountTotalMinorUnits: orderRow.discountTotal,
    displayId: formatAdminOrderDisplayId(orderRow.id),
    dispute,
    fulfillmentStatus: orderRow.fulfillmentStatus,
    fulfillmentSteps: buildAdminOrderFulfillmentSteps({
      canceledAt: orderRow.canceledAt,
      createdAt: orderRow.createdAt,
      deliveredAt: orderRow.deliveredAt,
      fulfillmentStartedAt: resolveFulfillmentStartedAt(timelineRows),
      shippedAt: orderRow.shippedAt,
      status: orderRow.status,
    }),
    fulfillmentUiKey: resolveAdminOrderFulfillmentUiKey(orderRow.status, orderRow.fulfillmentStatus),
    id: orderRow.id,
    items: itemRows.map((row) => mapAdminOrderDetailItem(row)),
    payment:
      paymentRow === null
        ? undefined
        : {
            amountMinorUnits: paymentRow.amount,
            provider: paymentRow.provider,
            refundedAmountMinorUnits: paymentRow.refundedAmount,
            refundedAt: paymentRow.refundedAt ?? undefined,
            status: paymentRow.status,
            transactionId: paymentRow.transactionId ?? undefined,
          },
    paymentUiKey: resolveAdminOrderPaymentUiKey(paymentRow?.status),
    shippedAt: orderRow.shippedAt ?? undefined,
    shippingAddress: mapAdminOrderDetailAddress(orderRow.checkout?.shippingAddress),
    shippingTotalMinorUnits: orderRow.shippingTotal,
    status: orderRow.status,
    subtotalMinorUnits: orderRow.subtotal,
    tags: resolveAdminOrderDetailTags({
      customerOrderCount: customerStats.orderCount,
      deliveryType: deliveryMethod?.type,
      hasCustomerNote: customerNote !== undefined && customerNote !== "",
      hasDispute: dispute !== undefined,
      paymentStatus: paymentRow?.status,
      refundedAmount: paymentRow?.refundedAmount ?? 0,
      userId: orderRow.userId,
    }),
    taxTotalMinorUnits: orderRow.taxTotal,
    timeline: mapAdminOrderTimeline(timelineRows),
    totalMinorUnits: orderRow.total,
    trackingNumber: orderRow.trackingNumber ?? undefined,
    trackingUrl: orderRow.trackingUrl ?? undefined,
  }
}

interface BuildAdminOrderDetailInput {
  readonly customerStats: AdminOrderCustomerStats
  readonly itemRows: Awaited<ReturnType<typeof getAdminOrderItemRows>>
  readonly orderRow: AdminOrderDetailRow
  readonly timelineRows: AdminOrderTimelineRows
}

export const getAdminOrder = createServerFn({
  method: "GET",
})
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }): Promise<Order["adminOrderDetail"] | undefined> => {
    const orderRow = await getAdminOrderDetailRow(orderId)
    if (orderRow === undefined) {
      return undefined
    }

    const [itemRows, timelineRows, customerStats] = await Promise.all([
      getAdminOrderItemRows(orderId),
      getAdminOrderTimelineRows(orderId),
      orderRow.userId === null ? Promise.resolve(GUEST_CUSTOMER_STATS) : getAdminOrderCustomerStats(orderRow.userId),
    ])

    return buildAdminOrderDetail({ customerStats, itemRows, orderRow, timelineRows })
  })

export const getAdminOrderQuery = (orderId: string) =>
  queryOptions({
    queryFn: async () => {
      const detail = await getAdminOrder({
        data: {
          orderId,
        },
      })

      if (detail === undefined) {
        throw notFound()
      }

      return detail
    },
    queryKey: [...ORDER_QUERY_KEYS.ADMIN.ORDER_BY_ID, orderId],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ORDER_QUERY_STALE_MS,
  })

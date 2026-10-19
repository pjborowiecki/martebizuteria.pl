import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { isInpostShipxConfigured } from "~/src/integrations/inpost/inpost.shipx.server"
import { parseInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { getOrderWithdrawals } from "~/src/modules/order-withdrawal/order-withdrawal.accessors"
import {
  type AdminOrderCustomerStats,
  getAdminOrderCustomerStats,
  getAdminOrderDetailRow,
  getAdminOrderItemRows,
  getAdminOrderTimelineRows,
} from "~/src/modules/order/order.accessors"
import {
  ADMIN_ORDER_DETAIL_RETURNING_MIN_ORDERS,
  ADMIN_ORDER_DETAIL_TAG,
  ADMIN_ORDER_FULFILLMENT_STEPS,
  type AdminOrderDetailTag,
  type AdminOrderFulfillmentStepKey,
  ORDER_QUERY_KEYS,
  ORDER_QUERY_STALE_MS,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import {
  canRestockAdminOrder,
  mapAdminOrderDetailItem,
  mapAdminOrderTimeline,
  resolveAdminOrderDetailAddresses,
  resolveAdminOrderDispute,
  resolveAdminOrderEmailedSteps,
  resolveAdminOrderFulfillmentUiKey,
  resolveAdminOrderPaymentUiKey,
  resolveOrderTrackingUrl,
} from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

type AdminOrderDetailRow = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetailRow>>>

type AdminOrderTimelineRows = Awaited<ReturnType<typeof getAdminOrderTimelineRows>>

const GUEST_CUSTOMER_STATS: AdminOrderCustomerStats = {
  orderCount: 0,
  totalSpent: 0,
}

const resolveFulfillmentStepAt = (key: AdminOrderFulfillmentStepKey, snapshot: AdminOrderFulfillmentSnapshot): Date | undefined => {
  if (key === "confirmed") {
    return snapshot.createdAt
  }

  if (key === "processing") {
    return snapshot.fulfillmentStartedAt ?? undefined
  }

  if (key === "shipped") {
    return snapshot.shippedAt ?? undefined
  }

  return snapshot.deliveredAt ?? undefined
}

export const buildAdminOrderFulfillmentSteps = (snapshot: AdminOrderFulfillmentSnapshot): Order["adminOrderDetail"]["fulfillmentSteps"] => {
  if (snapshot.canceledAt !== null) {
    return []
  }

  const reached = (ADMIN_ORDER_FULFILLMENT_STEPS as readonly string[]).indexOf(
    resolveAdminOrderFulfillmentUiKey(snapshot.status, snapshot.fulfillmentStatus),
  )

  return ADMIN_ORDER_FULFILLMENT_STEPS.map((key, index) => ({
    at: index <= reached ? resolveFulfillmentStepAt(key, snapshot) : undefined,
    done: index <= reached,
    key,
  }))
}

export const resolveAdminOrderDetailTags = (snapshot: AdminOrderTagSnapshot): readonly AdminOrderDetailTag[] => {
  const tags: AdminOrderDetailTag[] = []

  if (snapshot.userId === null) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.GUEST)
  } else if (snapshot.customerOrderCount >= ADMIN_ORDER_DETAIL_RETURNING_MIN_ORDERS) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.RETURNING)
  }

  if (snapshot.deliveryType === "locker") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.LOCKER)
  } else if (snapshot.deliveryType === "in_store") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.IN_STORE)
  }

  if (snapshot.lockerUnconfirmed) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.LOCKER_UNCONFIRMED)
  }

  if (snapshot.hasDispute) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.DISPUTED)
  }

  if (snapshot.paymentStatus === "refunded") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.REFUNDED)
  } else if (snapshot.refundedAmount > 0) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.PARTIALLY_REFUNDED)
  }

  if (snapshot.awaitsRestock) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  }

  if (snapshot.hasCustomerNote) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.NOTE)
  }

  return tags
}

export const resolveAdminOrderCustomerName = (name: string | null | undefined, email: string): string => {
  const trimmed = name?.trim()

  return trimmed === undefined || trimmed === "" ? email : trimmed
}

const differentAddress = (address: string | undefined, orderEmail: string): string | undefined =>
  address === undefined || address.toLowerCase() === orderEmail.toLowerCase() ? undefined : address

export const buildAdminOrderDetailCustomer = (snapshot: AdminOrderCustomerSnapshot): Order["adminOrderDetail"]["customer"] => {
  const name = resolveAdminOrderCustomerName(snapshot.name, snapshot.email)

  return {
    accountEmail: differentAddress(snapshot.accountEmail, snapshot.email),
    email: snapshot.email,
    initials: resolveAdminCustomerInitials(name),
    name,
    orderCount: snapshot.orderCount,
    phone: snapshot.phone ?? undefined,
    recipientEmail: differentAddress(snapshot.recipient, snapshot.email),
    totalSpentMinorUnits: snapshot.totalSpent,
    userId: snapshot.userId ?? undefined,
  }
}

export interface AdminOrderFulfillmentSnapshot {
  readonly canceledAt: Date | null
  readonly createdAt: Date
  readonly deliveredAt: Date | null
  readonly fulfillmentStartedAt: Date | null
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly shippedAt: Date | null
  readonly status: Order["select"]["status"]
}

interface AdminOrderTagSnapshot {
  readonly awaitsRestock: boolean
  readonly customerOrderCount: number
  readonly deliveryType: DeliveryMethodType | undefined
  readonly hasCustomerNote: boolean
  readonly hasDispute: boolean
  readonly lockerUnconfirmed: boolean
  readonly paymentStatus: string | undefined
  readonly refundedAmount: number
  readonly userId: string | null
}

interface AdminOrderCustomerSnapshot {
  readonly accountEmail: string | undefined
  readonly email: string
  readonly name: string | null | undefined
  readonly orderCount: number
  readonly phone: string | null | undefined
  readonly recipient: string
  readonly totalSpent: number
  readonly userId: string | null
}

const buildAdminOrderDetail = ({
  customerStats,
  inpostConfigured,
  itemRows,
  locale,
  orderRow,
  timelineRows,
  withdrawals,
}: BuildAdminOrderDetailInput): Order["adminOrderDetail"] => {
  const dispute = resolveAdminOrderDispute(orderRow.metadata)
  const customerNote = orderRow.customerNote?.trim()
  const { deliveryMethod } = orderRow
  const paymentRow = orderRow.payment
  const restockedAt = orderRow.restockedAt ?? undefined
  const { billingAddress, billingSameAsShipping, shippingAddress } = resolveAdminOrderDetailAddresses(orderRow)

  return {
    billingAddress,
    billingCompanyName: orderRow.billingCompanyName ?? undefined,
    billingNip: orderRow.billingNip ?? undefined,
    billingSameAsShipping,
    canceledAt: orderRow.canceledAt ?? undefined,
    createdAt: orderRow.createdAt,
    currencyCode: orderRow.currencyCode,
    customer: buildAdminOrderDetailCustomer({
      accountEmail: orderRow.user?.email,
      email: orderRow.email,
      name: orderRow.user?.name,
      orderCount: customerStats.orderCount,
      phone: orderRow.user?.phone,
      recipient: orderRow.recipient,
      totalSpent: customerStats.totalSpent,
      userId: orderRow.userId,
    }),
    customerNote: customerNote === undefined || customerNote === "" ? undefined : customerNote,
    deliveredAt: orderRow.deliveredAt ?? undefined,
    delivery:
      deliveryMethod === null
        ? undefined
        : {
            courierCode: deliveryMethod.courier.internalCode,
            courierName: deliveryMethod.courier.name,
            lockerId: orderRow.lockerId ?? undefined,
            lockerPoint: parseInpostLockerPoint(orderRow.lockerPoint),
            lockerUnconfirmed: orderRow.lockerUnconfirmed,
            methodName: resolveLocalizedString(deliveryMethod.names, locale),
            type: deliveryMethod.type,
          },
    discountTotalMinorUnits: orderRow.discountTotal,
    displayId: orderRow.orderNumber,
    dispute,
    emailedSteps: resolveAdminOrderEmailedSteps(orderRow),
    fulfillmentStatus: orderRow.fulfillmentStatus,
    fulfillmentSteps: buildAdminOrderFulfillmentSteps({
      canceledAt: orderRow.canceledAt,
      createdAt: orderRow.createdAt,
      deliveredAt: orderRow.deliveredAt,
      fulfillmentStartedAt: orderRow.fulfillmentStartedAt,
      fulfillmentStatus: orderRow.fulfillmentStatus,
      shippedAt: orderRow.shippedAt,
      status: orderRow.status,
    }),
    fulfillmentUiKey: resolveAdminOrderFulfillmentUiKey(orderRow.status, orderRow.fulfillmentStatus),
    id: orderRow.id,
    inpostConfigured,
    inpostShipment:
      orderRow.inpostShipmentId === null
        ? undefined
        : { id: orderRow.inpostShipmentId, status: orderRow.inpostShipmentStatus ?? undefined },
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
    restockedAt,
    shippedAt: orderRow.shippedAt ?? undefined,
    shippingAddress,
    shippingTotalMinorUnits: orderRow.shippingTotal,
    status: orderRow.status,
    subtotalMinorUnits: orderRow.subtotal,
    tags: resolveAdminOrderDetailTags({
      awaitsRestock: canRestockAdminOrder({ restockedAt, status: orderRow.status }),
      customerOrderCount: customerStats.orderCount,
      deliveryType: deliveryMethod?.type,
      hasCustomerNote: customerNote !== undefined && customerNote !== "",
      hasDispute: dispute !== undefined,
      lockerUnconfirmed: orderRow.lockerUnconfirmed,
      paymentStatus: paymentRow?.status,
      refundedAmount: paymentRow?.refundedAmount ?? 0,
      userId: orderRow.userId,
    }),
    taxBasisPoints: orderRow.taxBasisPoints,
    taxTotalMinorUnits: orderRow.taxTotal,
    timeline: mapAdminOrderTimeline(timelineRows),
    totalMinorUnits: orderRow.total,
    trackingNumber: orderRow.trackingNumber ?? undefined,
    trackingUrl: resolveOrderTrackingUrl({
      courierCode: deliveryMethod?.courier.internalCode,
      deliveryType: deliveryMethod?.type,
      trackingNumber: orderRow.trackingNumber,
      trackingUrl: orderRow.trackingUrl,
    }),
    withdrawals,
  }
}

interface BuildAdminOrderDetailInput {
  readonly customerStats: AdminOrderCustomerStats
  readonly inpostConfigured: boolean
  readonly itemRows: Awaited<ReturnType<typeof getAdminOrderItemRows>>
  readonly locale: string
  readonly orderRow: AdminOrderDetailRow
  readonly timelineRows: AdminOrderTimelineRows
  readonly withdrawals: Order["adminOrderDetail"]["withdrawals"]
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

    const [itemRows, timelineRows, customerStats, withdrawals] = await Promise.all([
      getAdminOrderItemRows(orderId),
      getAdminOrderTimelineRows(orderId),
      orderRow.userId === null ? Promise.resolve(GUEST_CUSTOMER_STATS) : getAdminOrderCustomerStats(orderRow.userId),
      getOrderWithdrawals(orderId),
    ])

    return buildAdminOrderDetail({
      customerStats,
      inpostConfigured: isInpostShipxConfigured(),
      itemRows,
      locale: getCurrentLocale(),
      orderRow,
      timelineRows,
      withdrawals,
    })
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

import { type SQL, and, count, desc, eq, exists, inArray, ne, not, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/modules/_core/utils/column-filters.server"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import {
  ADMIN_ORDER_COMPLETED_STATUS,
  ADMIN_ORDER_COUNTABLE_STATUSES,
  ADMIN_ORDER_CUSTOMER_COUNTABLE_STATUSES,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STAT_FILTER,
  ADMIN_ORDER_TAB,
  ADMIN_ORDER_TIMELINE_ACTIONS,
  type AdminOrderStatFilter,
  type AdminOrderTab,
} from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { payment } from "~/src/modules/payment/payment.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"
import { user } from "~/src/modules/user/user.schema"

const buildAdminOrderFulfillmentUiCondition = (
  fulfillmentUiKey: (typeof ADMIN_ORDER_FULFILLMENT_UI_KEY)[keyof typeof ADMIN_ORDER_FULFILLMENT_UI_KEY],
): SQL => {
  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING) {
    return eq(order.status, "pending")
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED) {
    return and(ne(order.status, "pending"), inArray(order.fulfillmentStatus, ["not_fulfilled", "partially_fulfilled", "fulfilled"]))!
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED) {
    return eq(order.fulfillmentStatus, "shipped")
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED) {
    return eq(order.fulfillmentStatus, "delivered")
  }

  return eq(order.fulfillmentStatus, "cancelled")
}

const buildAdminOrderTabCondition = (tab: AdminOrderTab | undefined): SQL | undefined => {
  if (tab === undefined || tab === ADMIN_ORDER_TAB.ALL) {
    return undefined
  }

  if (tab === ADMIN_ORDER_TAB.PENDING) {
    return eq(order.status, "pending")
  }

  if (tab === ADMIN_ORDER_TAB.UNFULFILLED) {
    return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED)
  }

  if (tab === ADMIN_ORDER_TAB.SHIPPED) {
    return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED)
  }

  return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED)
}

const buildAdminOrderPaymentUiCondition = (
  paymentUiKey: (typeof ADMIN_ORDER_PAYMENT_UI_KEY)[keyof typeof ADMIN_ORDER_PAYMENT_UI_KEY],
): SQL => {
  if (paymentUiKey === ADMIN_ORDER_PAYMENT_UI_KEY.PAID) {
    return eq(payment.status, "succeeded")
  }

  if (paymentUiKey === ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED) {
    return eq(payment.status, "refunded")
  }

  return or(sql`${payment.status} is null`, not(inArray(payment.status, ["succeeded", "refunded"])))!
}

const buildAdminOrderStatFilterCondition = (statFilter: AdminOrderStatFilter | undefined): SQL | undefined => {
  if (statFilter === undefined || statFilter === ADMIN_ORDER_STAT_FILTER.TOTAL) {
    return undefined
  }

  return eq(order.status, "pending")
}

const appendAdminOrdersListFilterConditions = (conditions: SQL[], filters: Order["adminListFilters"]): void => {
  if (filters.status !== undefined) {
    conditions.push(eq(order.status, filters.status))
  }

  if (filters.payment !== undefined) {
    conditions.push(buildAdminOrderPaymentUiCondition(filters.payment))
  }

  if (filters.fulfillment !== undefined) {
    conditions.push(buildAdminOrderFulfillmentUiCondition(filters.fulfillment))
  }

  if (filters.total !== undefined) {
    conditions.push(buildAdminNumericFilterSql(sql`${order.total}`, filters.total))
  }

  if (filters.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${order.createdAt}`, filters.createdAt))
  }
}

const buildAdminOrdersWhere = (params: Pick<AdminOrdersListParams, "filters" | "search" | "statFilter" | "tab">): SQL | undefined => {
  const conditions: SQL[] = []
  const filters = params.filters ?? {}
  const searchCondition = buildAdminSearchOrCondition(params.search, [
    order.id,
    order.email,
    order.trackingNumber,
    user.name,
    user.id,
    user.email,
  ])

  if (searchCondition !== undefined) {
    conditions.push(searchCondition)
  }

  const tabCondition = buildAdminOrderTabCondition(params.tab)
  if (tabCondition !== undefined) {
    conditions.push(tabCondition)
  }

  const statCondition = buildAdminOrderStatFilterCondition(params.statFilter)
  if (statCondition !== undefined) {
    conditions.push(statCondition)
  }
  appendAdminOrdersListFilterConditions(conditions, filters)
  if (conditions.length === 0) {
    return undefined
  }

  return and(...conditions)
}

const adminOrdersBaseQuery = (whereClause: SQL | undefined) =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      customerName: user.name,
      email: order.email,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      paymentStatus: sql<(typeof payment.$inferSelect)["status"] | null>`${payment.status}`.as("payment_status"),
      status: order.status,
      total: order.total,
      userId: order.userId,
    })
    .from(order)
    .leftJoin(user, eq(order.userId, user.id))
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(whereClause)
    .orderBy(desc(order.createdAt))

const attachItemCounts = async <
  TRow extends {
    id: string
  },
>(
  rows: readonly TRow[],
): Promise<
  (TRow & {
    itemCount: number
  })[]
> => {
  if (rows.length === 0) {
    return []
  }

  const orderIds = rows.map((row) => row.id)
  const itemCountRows = await db
    .select({
      itemCount: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`,
      orderId: orderItem.orderId,
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, orderIds))
    .groupBy(orderItem.orderId)
  const itemCountByOrderId = new Map(itemCountRows.map((row) => [row.orderId, row.itemCount]))

  return rows.map((row) => ({
    ...row,
    itemCount: itemCountByOrderId.get(row.id) ?? 0,
  }))
}

export const getAdminOrdersPage = async (params: AdminOrdersListParams) => {
  const whereClause = buildAdminOrdersWhere(params)
  const [[countRow], rows] = await db.batch([
    db
      .select({
        count: count(),
      })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .leftJoin(payment, eq(order.paymentId, payment.id))
      .where(whereClause),
    adminOrdersBaseQuery(whereClause).limit(params.limit).offset(params.offset),
  ])

  const rowsWithItemCounts = await attachItemCounts(rows)

  return {
    rows: rowsWithItemCounts,
    total: countRow?.count ?? 0,
  }
}

export const getAdminOrdersExport = async (params: Omit<AdminOrdersListParams, "limit" | "offset">) => {
  const whereClause = buildAdminOrdersWhere(params)
  const rows = await adminOrdersBaseQuery(whereClause)

  return attachItemCounts(rows)
}

export const getAdminOrderStats = async (): Promise<Order["adminStats"]> => {
  const [[totalRow], [pendingRow], [revenueRow], [avgRow], [currencyRow]] = await db.batch([
    db
      .select({
        count: count(),
      })
      .from(order)
      .where(inArray(order.status, [...ADMIN_ORDER_COUNTABLE_STATUSES])),
    db
      .select({
        count: count(),
      })
      .from(order)
      .where(eq(order.status, "pending")),
    db
      .select({
        total: sql<number>`coalesce(sum(${order.total}), ${0})`,
      })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS)),
    db
      .select({
        average: sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(${order.total}), ${0}) * 1.0 / count(*)) as integer) else ${0} end`,
      })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS)),
    db
      .select({
        currencyCode: sql<string>`max(${order.currencyCode})`,
      })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS)),
  ])

  return {
    avgValueMinorUnits: avgRow?.average ?? 0,
    currencyCode: currencyRow?.currencyCode ?? STORE_CURRENCY_CODE,
    pending: pendingRow?.count ?? 0,
    revenueMinorUnits: revenueRow?.total ?? 0,
    totalOrders: totalRow?.count ?? 0,
  }
}

export const getAdminOrderDetailRow = (orderId: string) =>
  db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: {
      addresses: true,
      checkout: {
        columns: {
          billingAddressId: true,
          shippingAddressId: true,
        },
        with: {
          billingAddress: true,
          shippingAddress: true,
        },
      },
      deliveryMethod: {
        with: {
          courier: {
            columns: {
              name: true,
            },
          },
        },
      },
      payment: true,
      user: {
        columns: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  })

export const getAdminOrderItemRows = (orderId: string) =>
  db
    .select({
      id: orderItem.id,
      productHandle: product.handle,
      quantity: orderItem.quantity,
      sku: productVariant.sku,
      thumbnail: sql<string | null>`coalesce(${orderItem.thumbnail}, ${product.thumbnail})`.as("thumbnail"),
      title: orderItem.title,
      total: orderItem.total,
      unitPrice: orderItem.unitPrice,
      variantTitle: sql<string | null>`coalesce(${orderItem.variantTitle}, ${productVariant.title})`.as("variant_title"),
    })
    .from(orderItem)
    .leftJoin(productVariant, eq(orderItem.variantId, productVariant.id))
    .leftJoin(product, eq(productVariant.productId, product.id))
    .where(eq(orderItem.orderId, orderId))
    .orderBy(orderItem.createdAt)

export const getAdminOrderTimelineRows = (orderId: string) =>
  db
    .select({
      action: auditLog.action,
      actorName: auditLog.actorName,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      id: auditLog.id,
      severity: auditLog.severity,
    })
    .from(auditLog)
    .where(and(eq(auditLog.resourceId, orderId), inArray(auditLog.action, [...ADMIN_ORDER_TIMELINE_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))

export const getAdminOrderCustomerStats = async (userId: string): Promise<AdminOrderCustomerStats> => {
  const [row] = await db
    .select({
      orderCount: count(),
      totalSpent: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_ORDER_COMPLETED_STATUS} then ${order.total} else ${0} end), ${0})`,
    })
    .from(order)
    .where(and(eq(order.userId, userId), inArray(order.status, [...ADMIN_ORDER_CUSTOMER_COUNTABLE_STATUSES])))

  return {
    orderCount: row?.orderCount ?? 0,
    totalSpent: row?.totalSpent ?? 0,
  }
}

export const getAdminOrderRefundTarget = async (orderId: string): Promise<AdminOrderRefundTarget | undefined> => {
  const [row] = await db
    .select({
      metadata: order.metadata,
      paymentStatus: payment.status,
      status: order.status,
      total: order.total,
      transactionId: payment.transactionId,
    })
    .from(order)
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(eq(order.id, orderId))
    .limit(1)

  return row
}

export interface AdminOrderRefundTarget {
  readonly metadata: string | null
  readonly paymentStatus: (typeof payment.$inferSelect)["status"] | null
  readonly status: Order["select"]["status"]
  readonly total: number
  readonly transactionId: string | null
}

export interface AdminOrderCustomerStats {
  readonly orderCount: number
  readonly totalSpent: number
}

export const getOrderByCheckoutId = (checkoutId: string) =>
  db.query.order.findFirst({
    columns: {
      id: true,
      status: true,
    },
    where: eq(order.checkoutId, checkoutId),
  })

export const getOrderMetadata = (orderId: string) =>
  db.query.order.findFirst({
    columns: {
      metadata: true,
    },
    where: eq(order.id, orderId),
  })

const orderPaymentMatchesTransaction = (transactionId: string) => {
  const matchingPayment = db
    .select({ one: sql`1` })
    .from(payment)
    .where(and(eq(payment.id, order.paymentId), eq(payment.transactionId, transactionId)))

  return exists(matchingPayment)
}

export const getOrderByTransactionId = (transactionId: string) =>
  db.query.order.findFirst({
    where: orderPaymentMatchesTransaction(transactionId),
    with: {
      addresses: true,
      checkout: {
        with: {
          shippingAddress: true,
        },
      },
      deliveryMethod: {
        with: {
          courier: {
            columns: {
              name: true,
            },
          },
        },
      },
    },
  })

export const getOrderTotalsForEmail = (orderId: string) =>
  db.query.order.findFirst({
    columns: {
      discountTotal: true,
      orderNumber: true,
      shippingTotal: true,
      subtotal: true,
      taxBasisPoints: true,
      taxTotal: true,
      total: true,
    },
    where: eq(order.id, orderId),
  })

export const getOrderForShippedEmail = (orderId: string) =>
  db.query.order.findFirst({
    columns: {
      checkoutId: true,
      email: true,
      id: true,
      metadata: true,
      orderNumber: true,
      trackingNumber: true,
      trackingUrl: true,
      userId: true,
    },
    where: eq(order.id, orderId),
  })

export const getRestockLinesForOrder = (orderId: string) =>
  db
    .select({
      quantity: orderItem.quantity,
      variantId: orderItem.variantId,
    })
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId))

export const updateOrderMetadata = async (orderId: string, metadata: string): Promise<void> => {
  await db
    .update(order)
    .set({
      metadata,
    })
    .where(eq(order.id, orderId))
}

export interface AdminOrdersListParams extends ListPaginationParams {
  readonly filters?: Order["adminListFilters"] | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminOrderStatFilter | undefined
  readonly tab?: AdminOrderTab | undefined
}

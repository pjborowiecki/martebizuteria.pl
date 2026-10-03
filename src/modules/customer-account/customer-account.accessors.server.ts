import { and, asc, count, desc, eq, inArray, ne, notInArray, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import {
  CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT,
  CUSTOMER_ACCOUNT_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_RECOMMENDED_CATEGORY_LIMIT,
  type CustomerAccountOrderFilter,
} from "~/src/modules/customer-account/customer-account.constants"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"

const NO_OFFSET = 0

interface CustomerOrderRowsOptions {
  readonly filter?: CustomerAccountOrderFilter
  readonly limit?: number
  readonly offset?: number
}
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"

export const getCustomerActivityAuditRows = (userId: string, orderIds: readonly string[] = []) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      metadata: auditLog.metadata,
      resourceId: auditLog.resourceId,
    })
    .from(auditLog)
    .where(and(inJsonList(auditLog.resourceId, [userId, ...orderIds]), inArray(auditLog.action, [...CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_AUDIT_TIMELINE_LIMIT)

const customerOrderFilterWhere = (userId: string, filter: CustomerAccountOrderFilter) => {
  const owned = eq(order.userId, userId)

  if (filter === "all") {
    return owned
  }

  if (filter === "cancelled") {
    return and(owned, or(eq(order.status, "cancelled"), eq(order.fulfillmentStatus, "cancelled")))
  }

  if (filter === "refunded") {
    return and(owned, eq(order.status, "refunded"))
  }

  if (filter === "delivered" || filter === "shipped") {
    return and(owned, ne(order.status, "refunded"), eq(order.fulfillmentStatus, filter))
  }

  return and(
    owned,
    notInArray(order.status, ["cancelled", "refunded"]),
    notInArray(order.fulfillmentStatus, ["cancelled", "delivered", "shipped"]),
  )
}

export const getCustomerOrderRows = (
  userId: string,
  { filter = "all", limit = CUSTOMER_ACCOUNT_ORDERS_LIMIT, offset = NO_OFFSET }: CustomerOrderRowsOptions = {},
) =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
    })
    .from(order)
    .where(customerOrderFilterWhere(userId, filter))
    .orderBy(desc(order.createdAt))
    .limit(limit)
    .offset(offset)

export const countCustomerOrders = async (userId: string, filter: CustomerAccountOrderFilter = "all"): Promise<number> => {
  const [row] = await db.select({ total: count() }).from(order).where(customerOrderFilterWhere(userId, filter))

  return row?.total ?? NO_OFFSET
}

const CUSTOMER_PAID_ORDER_STATUSES = ["processing", "completed"] as const

export const getCustomerSpendStats = async (userId: string): Promise<{ orderCount: number; totalSpent: number }> => {
  const [row] = await db
    .select({
      orderCount: count(),
      totalSpent: sql<number>`coalesce(sum(${order.total}), 0)`,
    })
    .from(order)
    .where(and(eq(order.userId, userId), inArray(order.status, [...CUSTOMER_PAID_ORDER_STATUSES])))

  return { orderCount: row?.orderCount ?? NO_OFFSET, totalSpent: row?.totalSpent ?? NO_OFFSET }
}

export const getCustomerPurchasedCategoryIds = async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ categoryId: categoryOnProduct.categoryId })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .innerJoin(productVariant, eq(orderItem.variantId, productVariant.id))
    .innerJoin(categoryOnProduct, eq(categoryOnProduct.productId, productVariant.productId))
    .where(and(eq(order.userId, userId), inArray(order.status, [...CUSTOMER_PAID_ORDER_STATUSES])))
    .groupBy(categoryOnProduct.categoryId)
    .orderBy(desc(count()))
    .limit(CUSTOMER_ACCOUNT_RECOMMENDED_CATEGORY_LIMIT)

  return rows.map((row) => row.categoryId)
}

export const getCustomerPurchasedProductIds = async (userId: string): Promise<string[]> => {
  const rows = await db
    .selectDistinct({ productId: productVariant.productId })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .innerJoin(productVariant, eq(orderItem.variantId, productVariant.id))
    .where(eq(order.userId, userId))

  return rows.map((row) => row.productId)
}

export const getCustomerLoginAuditRows = (userId: string) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      ip: auditLog.ip,
    })
    .from(auditLog)
    .where(
      and(eq(auditLog.resourceId, userId), inArray(auditLog.action, [AUDIT_LOG_ACTION.AUTH_LOGIN, AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED])),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT)

export const getCustomerOrderNumbers = (userId: string) =>
  db
    .select({ id: order.id, orderNumber: order.orderNumber })
    .from(order)
    .where(eq(order.userId, userId))
    .orderBy(desc(order.createdAt))
    .limit(CUSTOMER_ACCOUNT_ORDERS_LIMIT)

export const getOrderItemsForOrders = (orderIds: readonly string[]) => {
  if (orderIds.length === 0) {
    return []
  }

  return db
    .select({
      handle: product.handle,
      id: orderItem.id,
      orderId: orderItem.orderId,
      quantity: orderItem.quantity,
      thumbnail: customerOrderItemThumbnail,
      title: orderItem.title,
      total: orderItem.total,
      unitPrice: orderItem.unitPrice,
      variantTitle: customerOrderItemVariantTitle,
    })
    .from(orderItem)
    .leftJoin(productVariant, eq(orderItem.variantId, productVariant.id))
    .leftJoin(product, eq(productVariant.productId, product.id))
    .where(inJsonList(orderItem.orderId, orderIds))
    .orderBy(asc(orderItem.createdAt))
}

export const customerOrderItemThumbnail = sql<string | null>`coalesce(${orderItem.thumbnail}, ${product.thumbnail})`.as("thumbnail")

export const customerOrderItemVariantTitle = sql<string | null>`coalesce(${orderItem.variantTitle}, ${productVariant.title})`.as(
  "variant_title",
)

const CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS = [
  AUDIT_LOG_ACTION.AUTH_LOGIN,
  AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
  AUDIT_LOG_ACTION.AUTH_LOGOUT,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.ORDER_PLACED,
  AUDIT_LOG_ACTION.ORDER_RELEASED,
  AUDIT_LOG_ACTION.ORDER_SHIPPED,
] as const

import { and, count, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import {
  ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT,
  ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { payment } from "~/src/modules/payment/payment.schema"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { product } from "~/src/modules/product/product.schema"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS, ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
export const resolveTopProductName = (productTitles: unknown, fallbackTitle: string, locale: string): string => {
  if (productTitles === null || productTitles === undefined) {
    return fallbackTitle
  }
  return resolveProductTitle(productTitles, locale)
}
export const resolveTopProductCategoryLabel = (categoryTitles: unknown, locale: string): string => {
  if (categoryTitles === null || categoryTitles === undefined) {
    return EMPTY_LABEL
  }
  return resolveCategoryTitle(categoryTitles, locale)
}
export const completedRevenueSumQuery = (since: Date, until?: Date) => {
  const conditions = [eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until))
  }
  return db
    .select({
      total: sql<number>`coalesce(sum(${order.total}), ${0})`,
    })
    .from(order)
    .where(and(...conditions))
}
export const countableOrdersQuery = (since: Date, until?: Date) => {
  const conditions = [inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES]), gte(order.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until))
  }
  return db
    .select({
      count: count(),
    })
    .from(order)
    .where(and(...conditions))
}
export const newCustomersQuery = (since: Date, until?: Date) => {
  const conditions = [gte(user.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(user.createdAt, until))
  }
  return db
    .select({
      count: count(),
    })
    .from(user)
    .where(and(...conditions))
}
export const pageViewsQuery = (since: Date, until?: Date) => {
  const conditions = [eq(auditLog.action, AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED), gte(auditLog.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(auditLog.createdAt, until))
  }
  return db
    .select({
      count: count(),
    })
    .from(auditLog)
    .where(and(...conditions))
}
export const averageCompletedOrderValueQuery = (since: Date, until?: Date) => {
  const conditions = [eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until))
  }
  return db
    .select({
      average: sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(${order.total}), ${0}) * 1.0 / count(*)) as integer) else ${0} end`,
    })
    .from(order)
    .where(and(...conditions))
}
export const dailyOrderAggregatesQuery = (since: Date, until?: Date) => {
  const conditions = [gte(order.createdAt, since), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])]
  if (until !== undefined) {
    conditions.push(lte(order.createdAt, until))
  }
  return db
    .select({
      dateKey: sql<string>`strftime('%Y-%m-%d', ${order.createdAt})`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else ${0} end), ${0})`,
    })
    .from(order)
    .where(and(...conditions))
    .groupBy(sql`strftime('%Y-%m-%d', ${order.createdAt})`)
    .orderBy(sql`strftime('%Y-%m-%d', ${order.createdAt})`)
}
export const monthlyOrderAggregatesQuery = (since: Date) =>
  db
    .select({
      monthKey: sql<string>`strftime('%Y-%m', ${order.createdAt})`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else ${0} end), ${0})`,
    })
    .from(order)
    .where(and(gte(order.createdAt, since), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(sql`strftime('%Y-%m', ${order.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${order.createdAt})`)

export const recentOrdersQuery = () =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      customerName: user.name,
      email: order.email,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      paymentStatus: payment.status,
      status: order.status,
      total: order.total,
      userId: order.userId,
    })
    .from(order)
    .leftJoin(user, eq(order.userId, user.id))
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .orderBy(desc(order.createdAt))
    .limit(ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT)

export const topProductsQuery = () =>
  db
    .select({
      categoryTitles: sql<string | null>`max(${productCategory.titles})`,
      currencyCode: sql<string>`max(${order.currencyCode})`,
      productId: orderItem.productId,
      productTitles: sql<string | null>`max(${product.titles})`,
      revenue: sql<number>`coalesce(sum(${orderItem.total}), ${0})`,
      sold: sql<number>`coalesce(sum(${orderItem.quantity}), ${0})`,
      thumbnail: sql<string | null>`max(${orderItem.thumbnail})`,
      title: sql<string>`max(${orderItem.title})`,
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .leftJoin(product, eq(product.id, orderItem.productId))
    .leftJoin(categoryOnProduct, and(eq(categoryOnProduct.productId, orderItem.productId), eq(categoryOnProduct.isPrimary, true)))
    .leftJoin(productCategory, eq(productCategory.id, categoryOnProduct.categoryId))
    .where(eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS))
    .groupBy(orderItem.productId)
    .orderBy(sql`coalesce(sum(${orderItem.quantity}), ${0}) desc`)
    .limit(ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT)

const EMPTY_LABEL = ""

import { and, desc, eq, gte, inArray, isNotNull, max, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { address } from "~/src/modules/address/address.schema"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { payment } from "~/src/modules/payment/payment.schema"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { session } from "~/src/modules/session/session.schema"
import {
  ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS,
  ADMIN_CUSTOMER_DETAIL_ORDERS_LIMIT,
  ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES,
} from "~/src/modules/user/user.constants"
export const getDefaultCustomerAddressFullQuery = (userId: string) =>
  db
    .select({
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      countryCode: address.countryCode,
      postalCode: address.postalCode,
      province: address.province,
    })
    .from(address)
    .where(and(eq(address.userId, userId), eq(address.isDefault, true)))
    .limit(1)

export const getLatestSessionActivityQuery = (userId: string) =>
  db
    .select({
      lastActiveAt: max(session.updatedAt),
    })
    .from(session)
    .where(eq(session.userId, userId))

export const getCustomerMonthlySpendingQuery = (userId: string, since: Date) =>
  db
    .select({
      amount: sql<number>`coalesce(sum(${order.total}), 0)`,
      monthKey: sql<string>`strftime('%Y-%m', ${order.createdAt})`,
    })
    .from(order)
    .where(and(eq(order.userId, userId), eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)))
    .groupBy(sql`strftime('%Y-%m', ${order.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${order.createdAt})`)

export const getCustomerCategoryBreakdownQuery = (userId: string) =>
  db
    .select({
      amount: sql<number>`coalesce(sum(${orderItem.total}), 0)`,
      titles: productCategory.titles,
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .leftJoin(categoryOnProduct, and(eq(categoryOnProduct.productId, orderItem.productId), eq(categoryOnProduct.isPrimary, true)))
    .leftJoin(productCategory, eq(productCategory.id, categoryOnProduct.categoryId))
    .where(and(eq(order.userId, userId), eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), isNotNull(productCategory.id)))
    .groupBy(productCategory.id)
    .orderBy(sql`coalesce(sum(${orderItem.total}), 0) desc`)
    .limit(TOP_CATEGORY_LIMIT)

export const getCustomerPreferredCategoryQuery = (userId: string) =>
  db
    .select({
      amount: sql<number>`coalesce(sum(${orderItem.total}), 0)`,
      titles: productCategory.titles,
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .leftJoin(categoryOnProduct, and(eq(categoryOnProduct.productId, orderItem.productId), eq(categoryOnProduct.isPrimary, true)))
    .leftJoin(productCategory, eq(productCategory.id, categoryOnProduct.categoryId))
    .where(and(eq(order.userId, userId), eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), isNotNull(productCategory.id)))
    .groupBy(productCategory.id)
    .orderBy(sql`coalesce(sum(${orderItem.total}), 0) desc`)
    .limit(1)

export const getCustomerPreferredCollectionQuery = (userId: string) =>
  db
    .select({
      amount: sql<number>`coalesce(sum(${orderItem.total}), 0)`,
      titles: productCollection.titles,
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .innerJoin(collectionOnProduct, eq(collectionOnProduct.productId, orderItem.productId))
    .innerJoin(productCollection, eq(productCollection.id, collectionOnProduct.collectionId))
    .where(and(eq(order.userId, userId), eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS)))
    .groupBy(productCollection.id)
    .orderBy(sql`coalesce(sum(${orderItem.total}), 0) desc`)
    .limit(1)

export const getAdminCustomerOrderRowsQuery = (userId: string) =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      paymentStatus: payment.status,
      status: order.status,
      total: order.total,
    })
    .from(order)
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(and(eq(order.userId, userId), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .orderBy(desc(order.createdAt))
    .limit(ADMIN_CUSTOMER_DETAIL_ORDERS_LIMIT)

export const getCustomerAuditTimelineQuery = (userId: string) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .where(and(eq(auditLog.resourceId, userId), inArray(auditLog.action, [...CUSTOMER_AUDIT_TIMELINE_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_AUDIT_TIMELINE_LIMIT)

export const getOrderItemTitlesQuery = (orderIds: readonly string[]) => {
  if (orderIds.length === 0) {
    return Promise.resolve([])
  }
  return db
    .select({
      orderId: orderItem.orderId,
      title: orderItem.title,
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, [...orderIds]))
    .orderBy(orderItem.title)
}
const TOP_CATEGORY_LIMIT = 5
const CUSTOMER_AUDIT_TIMELINE_ACTIONS = [
  AUDIT_LOG_ACTION.AUTH_LOGIN,
  AUDIT_LOG_ACTION.AUTH_LOGOUT,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED,
] as const

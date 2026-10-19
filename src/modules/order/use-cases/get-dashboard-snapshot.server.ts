import { and, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { netSalesAverage, netSalesSum, orderCountsAsSale } from "~/src/modules/order/order.accessors"
import { ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT, ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { payment } from "~/src/modules/payment/payment.schema"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { product } from "~/src/modules/product/product.schema"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
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

export const salesTotalsQuery = (since: Date, until?: Date) => {
  const conditions = [orderCountsAsSale, gte(order.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until))
  }

  return db
    .select({
      averageOrderValue: netSalesAverage,
      orders: count(),
      revenue: netSalesSum,
    })
    .from(order)
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(and(...conditions))
}

export const recentOrdersQuery = () =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      customerName: user.name,
      deliveredEmailAt: order.deliveredEmailAt,
      email: order.email,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      inProgressEmailAt: order.inProgressEmailAt,
      metadata: order.metadata,
      orderNumber: order.orderNumber,
      paymentStatus: sql<(typeof payment.$inferSelect)["status"] | null>`${payment.status}`.as("payment_status"),
      shippedEmailAt: order.shippedEmailAt,
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
      categoryTitles: sql<string | null>`max(${productCategory.titles})`.as("category_titles"),
      currencyCode: sql<string>`max(${order.currencyCode})`,
      productId: sql<string>`${orderItem.productId}`,
      productTitles: sql<string | null>`max(${product.titles})`.as("product_titles"),
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
    .where(and(orderCountsAsSale, isNotNull(orderItem.productId)))
    .groupBy(orderItem.productId)
    .orderBy(sql`coalesce(sum(${orderItem.quantity}), ${0}) desc`)
    .limit(ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT)

const EMPTY_LABEL = ""

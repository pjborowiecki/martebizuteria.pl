import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { CUSTOMER_ACCOUNT_ORDERS_LIMIT } from "~/src/modules/customer-account/customer-account.constants"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES } from "~/src/modules/user/user.constants"

export const getCustomerActivityAuditRows = (userId: string) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .where(and(eq(auditLog.resourceId, userId), inArray(auditLog.action, [...CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_AUDIT_TIMELINE_LIMIT)

export const getCustomerOrderRows = (userId: string, limit = CUSTOMER_ACCOUNT_ORDERS_LIMIT) =>
  db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      status: order.status,
      total: order.total,
    })
    .from(order)
    .where(and(eq(order.userId, userId), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .orderBy(desc(order.createdAt))
    .limit(limit)

export const getOrderItemsForOrders = (orderIds: readonly string[]) => {
  if (orderIds.length === 0) {
    return []
  }

  return db
    .select({
      orderId: orderItem.orderId,
      quantity: orderItem.quantity,
      thumbnail: orderItem.thumbnail,
      title: orderItem.title,
      total: orderItem.total,
      variantTitle: orderItem.variantTitle,
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, [...orderIds]))
}

const CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS = [
  AUDIT_LOG_ACTION.AUTH_LOGIN,
  AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
  AUDIT_LOG_ACTION.AUTH_LOGOUT,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.ORDER_PLACED,
  AUDIT_LOG_ACTION.ORDER_RELEASED,
  AUDIT_LOG_ACTION.ORDER_SHIPPED,
] as const

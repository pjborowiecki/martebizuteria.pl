import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { auth } from "~/src/integrations/better-auth/auth._server";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants";
import { auditLog } from "~/src/modules/audit-log/audit-log.schema";
import {
  CUSTOMER_ACCOUNT_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT,
  CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT
} from "~/src/modules/customer-account/customer-account.constants";
import type {
  CustomerAccountLoginHistoryItem,
  CustomerAccountOrderDetail,
  CustomerAccountOrderSummary,
  CustomerAccountOverview,
  CustomerAccountProfile,
  CustomerAccountSession
} from "~/src/modules/customer-account/customer-account.types";
import {
  mapAuditLogToActivityItem,
  mapCustomerAccountAddressRow,
  mapCustomerOrderDetail,
  mapCustomerOrderSummaryRow,
  parseUserAgent
} from "~/src/modules/customer-account/customer-account.utils";
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { productAccessors } from "~/src/modules/product/product.accessors";
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants";
import { resolveProductTitle } from "~/src/modules/product/product.utils";
import { session } from "~/src/modules/session/session.schema";
import { userAccessors } from "~/src/modules/user/user.accessors";
import { ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES } from "~/src/modules/user/user.constants";
import { user } from "~/src/modules/user/user.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;
const ZERO_SPENT = 0;

const CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS = [
  AUDIT_LOG_ACTION.AUTH_LOGIN,
  AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
  AUDIT_LOG_ACTION.AUTH_LOGOUT,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.ORDER_PLACED,
  AUDIT_LOG_ACTION.ORDER_RELEASED,
  AUDIT_LOG_ACTION.ORDER_SHIPPED
] as const;

async function requireCustomerSession() {
  const headers = getRequestHeaders();
  const authSession = await auth.api.getSession({ headers });

  if (authSession?.user === undefined) {
    return;
  }

  return authSession;
}

function getCustomerActivityAuditRows(userId: string) {
  return db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      metadata: auditLog.metadata
    })
    .from(auditLog)
    .where(and(eq(auditLog.resourceId, userId), inArray(auditLog.action, [...CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_AUDIT_TIMELINE_LIMIT);
}

function getCustomerOrderRows(userId: string, limit = CUSTOMER_ACCOUNT_ORDERS_LIMIT) {
  return db
    .select({
      createdAt: order.createdAt,
      currencyCode: order.currencyCode,
      fulfillmentStatus: order.fulfillmentStatus,
      id: order.id,
      status: order.status,
      total: order.total
    })
    .from(order)
    .where(and(eq(order.userId, userId), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .orderBy(desc(order.createdAt))
    .limit(limit);
}

function getOrderItemsForOrders(orderIds: readonly string[]) {
  if (orderIds.length === EMPTY_LENGTH) {
    return [];
  }

  return db
    .select({
      orderId: orderItem.orderId,
      quantity: orderItem.quantity,
      thumbnail: orderItem.thumbnail,
      title: orderItem.title,
      total: orderItem.total,
      variantTitle: orderItem.variantTitle
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, [...orderIds]));
}

export async function getCustomerOrders(): Promise<readonly CustomerAccountOrderSummary[]> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return [];
  }

  const orderRows = await getCustomerOrderRows(authSession.user.id);
  const orderIds = orderRows.map((row) => row.id);
  const itemRows = await getOrderItemsForOrders(orderIds);
  const itemsByOrderId = new Map<string, typeof itemRows>();

  for (const itemRow of itemRows) {
    const current = itemsByOrderId.get(itemRow.orderId) ?? [];
    current.push(itemRow);
    itemsByOrderId.set(itemRow.orderId, current);
  }

  return orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? []));
}

export async function getCustomerOrderById(orderId: string): Promise<CustomerAccountOrderDetail | undefined> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return undefined;
  }

  const orderRow = await db.query.order.findFirst({
    where: and(eq(order.id, orderId), eq(order.userId, authSession.user.id)),
    with: {
      checkout: {
        with: {
          billingAddress: true,
          shippingAddress: true
        }
      },
      payment: true
    }
  });

  if (orderRow === undefined) {
    return undefined;
  }

  const items = await db
    .select({
      quantity: orderItem.quantity,
      thumbnail: orderItem.thumbnail,
      title: orderItem.title,
      total: orderItem.total,
      variantTitle: orderItem.variantTitle
    })
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));

  return mapCustomerOrderDetail(orderRow, items, {
    billingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.billingAddress ?? undefined),
    paymentProvider: orderRow.payment?.provider,
    shippingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.shippingAddress ?? undefined)
  });
}

export async function getCustomerOverview(locale: string = DEFAULT_LOCALE): Promise<CustomerAccountOverview | undefined> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return undefined;
  }

  const userId = authSession.user.id;
  const [orderStatsRows, orderRows, auditRows, userRow, collection] = await Promise.all([
    userAccessors.getCustomerOrderStatsQuery([userId]),
    getCustomerOrderRows(userId, CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT),
    getCustomerActivityAuditRows(userId),
    userAccessors.getUserById(userId),
    db.query.productCollection.findFirst({
      where: (collections, { eq: eqOp }) => eqOp(collections.handle, LANDING_NEW_ARRIVALS_COLLECTION_HANDLE)
    })
  ]);

  const orderIds = orderRows.map((row) => row.id);
  const itemRows = await getOrderItemsForOrders(orderIds);
  const itemsByOrderId = new Map<string, typeof itemRows>();

  for (const itemRow of itemRows) {
    const current = itemsByOrderId.get(itemRow.orderId) ?? [];
    current.push(itemRow);
    itemsByOrderId.set(itemRow.orderId, current);
  }

  const statsRow = orderStatsRows.find((row) => row.userId === userId) ?? {
    orderCount: ZERO_COUNT,
    totalSpent: ZERO_SPENT
  };

  const activity = auditRows
    .map((row) => mapAuditLogToActivityItem(row))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .slice(EMPTY_LENGTH, CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT);

  let recommendations: CustomerAccountOverview["recommendations"] = [];

  if (collection !== undefined) {
    const { items } = await productAccessors.getPublishedProductsByCollectionId(collection.id, {
      limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
      offset: ZERO_COUNT
    });

    recommendations = items.map((productRow) => {
      const variant = productRow.variants?.[ZERO_COUNT];
      return {
        handle: productRow.handle,
        image: getProductImageUrl(productRow.thumbnail),
        name: resolveProductTitle(productRow.titles, locale),
        priceMinorUnits: variant?.price,
        productId: productRow.id
      };
    });
  }

  const memberSince = userRow?.createdAt ?? authSession.user.createdAt;

  return {
    activity,
    recentOrders: orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? [])),
    recommendations,
    stats: {
      memberSinceYear: String(memberSince.getFullYear()),
      totalOrders: statsRow.orderCount ?? ZERO_COUNT,
      totalSpentMinorUnits: statsRow.totalSpent ?? ZERO_SPENT,
      wishlistCount: ZERO_COUNT
    }
  };
}

export async function getCustomerProfile(): Promise<CustomerAccountProfile | undefined> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return undefined;
  }

  const userRow = await userAccessors.getUserById(authSession.user.id);
  if (userRow === undefined) {
    return undefined;
  }

  return {
    createdAt: userRow.createdAt,
    email: userRow.email,
    name: userRow.name,
    phone: userRow.phone ?? undefined,
    timezone: userRow.timezone ?? undefined
  };
}

export async function getCustomerSessions(): Promise<readonly CustomerAccountSession[]> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return [];
  }

  const rows = await db.select().from(session).where(eq(session.userId, authSession.user.id)).orderBy(desc(session.updatedAt));

  return rows.map((row) => {
    const parsed = parseUserAgent(row.userAgent);
    return {
      browser: parsed.browser,
      createdAt: row.createdAt,
      device: parsed.device,
      deviceType: parsed.deviceType,
      id: row.id,
      ipAddress: row.ipAddress ?? undefined,
      isCurrent: row.id === authSession.session.id,
      lastActiveAt: row.updatedAt
    } satisfies CustomerAccountSession;
  });
}

export async function getCustomerLoginHistory(): Promise<readonly CustomerAccountLoginHistoryItem[]> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return [];
  }

  const rows = await getCustomerActivityAuditRows(authSession.user.id);

  return rows
    .filter((row) => row.action === AUDIT_LOG_ACTION.AUTH_LOGIN || row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED)
    .map(
      (row) =>
        ({
          createdAt: row.createdAt,
          detail: row.detail ?? undefined,
          status: row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED ? "blocked" : "success"
        }) satisfies CustomerAccountLoginHistoryItem
    );
}

export async function revokeCustomerSession(sessionId: string): Promise<boolean> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return false;
  }

  if (sessionId === authSession.session.id) {
    return false;
  }

  await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, authSession.user.id)));
  return true;
}

export async function revokeOtherCustomerSessions(): Promise<void> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return;
  }

  await db.delete(session).where(and(eq(session.userId, authSession.user.id), ne(session.id, authSession.session.id)));
}

export async function updateCustomerPhone(phone: string | undefined): Promise<boolean> {
  const authSession = await requireCustomerSession();
  if (authSession === undefined) {
    return false;
  }

  await db
    .update(user)
    .set({ phone: phone === "" ? sql`NULL` : phone })
    .where(eq(user.id, authSession.user.id));
  return true;
}

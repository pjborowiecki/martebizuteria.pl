import { and, count, desc, eq, inArray, ne, not, or, sql, type SQL } from "drizzle-orm";

import { STORE_CURRENCY_CODE } from "~/src/constants/_constants/currency";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/lib/_utils/admin-column-filters.server";
import { buildAdminSearchOrCondition } from "~/src/lib/_utils/admin-search.server";
import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { orderItem } from "~/src/modules/order-item/order-item.schema";
import type { AdminOrdersListFilters } from "~/src/modules/order/order.admin-list-filters";
import {
  ADMIN_ORDER_COMPLETED_STATUS,
  ADMIN_ORDER_COUNTABLE_STATUSES,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STAT_FILTER,
  ADMIN_ORDER_TAB,
  type AdminOrderStatFilter,
  type AdminOrderTab
} from "~/src/modules/order/order.constants";
import { order } from "~/src/modules/order/order.schema";
import type { AdminOrderStats } from "~/src/modules/order/order.types";
import { payment } from "~/src/modules/payment/payment.schema";
import { user } from "~/src/modules/user/user.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;
const ZERO_REVENUE = 0;
const ZERO_AVERAGE = 0;
export interface AdminOrdersListParams extends ListPaginationParams {
  readonly filters?: AdminOrdersListFilters;
  readonly search?: string;
  readonly statFilter?: AdminOrderStatFilter;
  readonly tab?: AdminOrderTab;
}

async function runBatch(statements: readonly DrizzleBatchStatement[]): Promise<void> {
  await runDrizzleBatch(statements);
}

function buildAdminOrderFulfillmentUiCondition(
  fulfillmentUiKey: (typeof ADMIN_ORDER_FULFILLMENT_UI_KEY)[keyof typeof ADMIN_ORDER_FULFILLMENT_UI_KEY]
): SQL {
  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING) {
    return eq(order.status, "pending");
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED) {
    return and(ne(order.status, "pending"), inArray(order.fulfillmentStatus, ["not_fulfilled", "partially_fulfilled", "fulfilled"]))!;
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED) {
    return eq(order.fulfillmentStatus, "shipped");
  }

  if (fulfillmentUiKey === ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED) {
    return eq(order.fulfillmentStatus, "delivered");
  }

  return eq(order.fulfillmentStatus, "cancelled");
}

function buildAdminOrderTabCondition(tab: AdminOrderTab | undefined): SQL | undefined {
  if (tab === undefined || tab === ADMIN_ORDER_TAB.ALL) {
    return undefined;
  }

  if (tab === ADMIN_ORDER_TAB.PENDING) {
    return eq(order.status, "pending");
  }

  if (tab === ADMIN_ORDER_TAB.UNFULFILLED) {
    return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED);
  }

  if (tab === ADMIN_ORDER_TAB.SHIPPED) {
    return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED);
  }

  return buildAdminOrderFulfillmentUiCondition(ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED);
}

function buildAdminOrderPaymentUiCondition(
  paymentUiKey: (typeof ADMIN_ORDER_PAYMENT_UI_KEY)[keyof typeof ADMIN_ORDER_PAYMENT_UI_KEY]
): SQL {
  if (paymentUiKey === ADMIN_ORDER_PAYMENT_UI_KEY.PAID) {
    return eq(payment.status, "succeeded");
  }

  if (paymentUiKey === ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED) {
    return eq(payment.status, "refunded");
  }

  return or(sql`${payment.status} is null`, not(inArray(payment.status, ["succeeded", "refunded"])))!;
}

function buildAdminOrderStatFilterCondition(statFilter: AdminOrderStatFilter | undefined): SQL | undefined {
  if (statFilter === undefined || statFilter === ADMIN_ORDER_STAT_FILTER.TOTAL) {
    return undefined;
  }

  return eq(order.status, "pending");
}

function appendAdminOrdersListFilterConditions(conditions: SQL[], filters: AdminOrdersListFilters): void {
  if (filters.status !== undefined) {
    conditions.push(eq(order.status, filters.status));
  }

  if (filters.payment !== undefined) {
    conditions.push(buildAdminOrderPaymentUiCondition(filters.payment));
  }

  if (filters.fulfillment !== undefined) {
    conditions.push(buildAdminOrderFulfillmentUiCondition(filters.fulfillment));
  }

  if (filters.total !== undefined) {
    conditions.push(buildAdminNumericFilterSql(sql`${order.total}`, filters.total));
  }

  if (filters.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${order.createdAt}`, filters.createdAt));
  }
}

function buildAdminOrdersWhere(params: Pick<AdminOrdersListParams, "filters" | "search" | "statFilter" | "tab">): SQL | undefined {
  const conditions: SQL[] = [];
  const filters = params.filters ?? {};

  const searchCondition = buildAdminSearchOrCondition(params.search, [
    order.id,
    order.email,
    order.trackingNumber,
    user.name,
    user.id,
    user.email
  ]);
  if (searchCondition !== undefined) {
    conditions.push(searchCondition);
  }

  const tabCondition = buildAdminOrderTabCondition(params.tab);
  if (tabCondition !== undefined) {
    conditions.push(tabCondition);
  }

  const statCondition = buildAdminOrderStatFilterCondition(params.statFilter);
  if (statCondition !== undefined) {
    conditions.push(statCondition);
  }

  appendAdminOrdersListFilterConditions(conditions, filters);

  if (conditions.length === EMPTY_LENGTH) {
    return undefined;
  }

  return and(...conditions);
}

function adminOrdersBaseQuery(whereClause: SQL | undefined) {
  return db
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
      userId: order.userId
    })
    .from(order)
    .leftJoin(user, eq(order.userId, user.id))
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(whereClause)
    .orderBy(desc(order.createdAt));
}

async function attachItemCounts<T extends { id: string }>(rows: readonly T[]): Promise<(T & { itemCount: number })[]> {
  if (rows.length === EMPTY_LENGTH) {
    return [];
  }

  const orderIds = rows.map((row) => row.id);
  const itemCountRows = await db
    .select({
      itemCount: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`,
      orderId: orderItem.orderId
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, orderIds))
    .groupBy(orderItem.orderId);

  const itemCountByOrderId = new Map(itemCountRows.map((row) => [row.orderId, row.itemCount]));

  return rows.map((row) => ({
    ...row,
    itemCount: itemCountByOrderId.get(row.id) ?? ZERO_COUNT
  }));
}

async function getAdminOrdersPage(params: AdminOrdersListParams) {
  const whereClause = buildAdminOrdersWhere(params);

  const [[countRow], rows] = await db.batch([
    db
      .select({ count: count() })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .leftJoin(payment, eq(order.paymentId, payment.id))
      .where(whereClause),
    adminOrdersBaseQuery(whereClause).limit(params.limit).offset(params.offset)
  ]);

  const rowsWithItemCounts = await attachItemCounts(rows);

  return {
    rows: rowsWithItemCounts,
    total: countRow?.count ?? EMPTY_LENGTH
  };
}

async function getAdminOrdersExport(params: Omit<AdminOrdersListParams, "limit" | "offset">) {
  const whereClause = buildAdminOrdersWhere(params);
  const rows = await adminOrdersBaseQuery(whereClause);
  return attachItemCounts(rows);
}

async function getAdminOrderStats(): Promise<AdminOrderStats> {
  const [[totalRow], [pendingRow], [revenueRow], [avgRow], [currencyRow]] = await db.batch([
    db
      .select({ count: count() })
      .from(order)
      .where(inArray(order.status, [...ADMIN_ORDER_COUNTABLE_STATUSES])),
    db.select({ count: count() }).from(order).where(eq(order.status, "pending")),
    db
      .select({ total: sql<number>`coalesce(sum(${order.total}), ${ZERO_REVENUE})` })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS)),
    db
      .select({
        average: sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(${order.total}), ${ZERO_REVENUE}) * 1.0 / count(*)) as integer) else ${ZERO_AVERAGE} end`
      })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS)),
    db
      .select({ currencyCode: sql<string>`max(${order.currencyCode})` })
      .from(order)
      .where(eq(order.status, ADMIN_ORDER_COMPLETED_STATUS))
  ]);

  return {
    avgValueMinorUnits: avgRow?.average ?? ZERO_AVERAGE,
    currencyCode: currencyRow?.currencyCode ?? STORE_CURRENCY_CODE,
    pending: pendingRow?.count ?? ZERO_COUNT,
    revenueMinorUnits: revenueRow?.total ?? ZERO_REVENUE,
    totalOrders: totalRow?.count ?? ZERO_COUNT
  };
}

function getPaymentByTransactionId(transactionId: string) {
  return db.query.payment.findFirst({
    columns: { checkoutId: true, id: true, refundedAmount: true, status: true },
    where: eq(payment.transactionId, transactionId)
  });
}

function getOrderByCheckoutId(checkoutId: string) {
  return db.query.order.findFirst({
    columns: { id: true, status: true },
    where: eq(order.checkoutId, checkoutId)
  });
}

function getOrderMetadata(orderId: string) {
  return db.query.order.findFirst({ columns: { metadata: true }, where: eq(order.id, orderId) });
}

function getOrderForShippedEmail(orderId: string) {
  return db.query.order.findFirst({
    columns: { checkoutId: true, email: true, id: true, metadata: true, userId: true },
    where: eq(order.id, orderId)
  });
}

function getRestockLinesForOrder(orderId: string) {
  return db.select({ quantity: orderItem.quantity, variantId: orderItem.variantId }).from(orderItem).where(eq(orderItem.orderId, orderId));
}

async function updateOrderMetadata(orderId: string, metadata: string): Promise<void> {
  await db.update(order).set({ metadata }).where(eq(order.id, orderId));
}

export const orderAccessors = {
  getAdminOrderStats,
  getAdminOrdersExport,
  getAdminOrdersPage,
  getOrderByCheckoutId,
  getOrderForShippedEmail,
  getOrderMetadata,
  getPaymentByTransactionId,
  getRestockLinesForOrder,
  runBatch,
  updateOrderMetadata
};

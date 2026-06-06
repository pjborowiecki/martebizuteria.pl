import { and, count, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { buildAdminSearchOrCondition } from "~/src/lib/_utils/admin-search.server";
import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { ADMIN_ORDER_TAB, type AdminOrderTab } from "~/src/modules/order/order.constants";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";
import { user } from "~/src/modules/user/user.schema";

const EMPTY_LENGTH = 0;

export interface AdminOrdersListParams extends ListPaginationParams {
  readonly search?: string;
  readonly tab?: AdminOrderTab;
}

async function runBatch(statements: readonly DrizzleBatchStatement[]): Promise<void> {
  await runDrizzleBatch(statements);
}

function buildAdminOrderTabCondition(tab: AdminOrderTab | undefined): SQL | undefined {
  if (tab === undefined || tab === ADMIN_ORDER_TAB.ALL) {
    return undefined;
  }

  if (tab === ADMIN_ORDER_TAB.PENDING) {
    return eq(order.status, "pending");
  }

  if (tab === ADMIN_ORDER_TAB.UNFULFILLED) {
    return and(ne(order.status, "pending"), inArray(order.fulfillmentStatus, ["not_fulfilled", "partially_fulfilled", "fulfilled"]));
  }

  if (tab === ADMIN_ORDER_TAB.SHIPPED) {
    return eq(order.fulfillmentStatus, "shipped");
  }

  return eq(order.fulfillmentStatus, "delivered");
}

function buildAdminOrdersWhere(params: Pick<AdminOrdersListParams, "search" | "tab">): SQL | undefined {
  const conditions: SQL[] = [];

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

  if (conditions.length === EMPTY_LENGTH) {
    return undefined;
  }

  return and(...conditions);
}

async function getAdminOrdersPage(params: AdminOrdersListParams) {
  const whereClause = buildAdminOrdersWhere(params);

  const [countRow] = await db
    .select({ count: count() })
    .from(order)
    .leftJoin(user, eq(order.userId, user.id))
    .leftJoin(payment, eq(order.paymentId, payment.id))
    .where(whereClause);

  const rows = await db
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
    .orderBy(desc(order.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  if (rows.length === EMPTY_LENGTH) {
    return { rows: [], total: countRow?.count ?? EMPTY_LENGTH };
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

  const rowsWithItemCounts = [];
  for (const row of rows) {
    rowsWithItemCounts.push({
      createdAt: row.createdAt,
      currencyCode: row.currencyCode,
      customerName: row.customerName,
      email: row.email,
      fulfillmentStatus: row.fulfillmentStatus,
      id: row.id,
      itemCount: itemCountByOrderId.get(row.id) ?? EMPTY_LENGTH,
      paymentStatus: row.paymentStatus,
      status: row.status,
      total: row.total,
      userId: row.userId
    });
  }

  return {
    rows: rowsWithItemCounts,
    total: countRow?.count ?? EMPTY_LENGTH
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

function getRestockLinesForOrder(orderId: string) {
  return db.select({ quantity: orderItem.quantity, variantId: orderItem.variantId }).from(orderItem).where(eq(orderItem.orderId, orderId));
}

async function updateOrderMetadata(orderId: string, metadata: string): Promise<void> {
  await db.update(order).set({ metadata }).where(eq(order.id, orderId));
}

export const orderAccessors = {
  getAdminOrdersPage,
  getOrderByCheckoutId,
  getOrderMetadata,
  getPaymentByTransactionId,
  getRestockLinesForOrder,
  runBatch,
  updateOrderMetadata
};

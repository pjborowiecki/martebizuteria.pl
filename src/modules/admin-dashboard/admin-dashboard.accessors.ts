import { and, count, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";

import { STORE_CURRENCY_CODE } from "~/src/constants/_constants/currency";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/_utils/iso-date";

import {
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT,
  ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT
} from "~/src/modules/admin-dashboard/admin-dashboard.constants";
import type {
  AdminDashboardChartPoint,
  AdminDashboardChartRangeInput,
  AdminDashboardSnapshot
} from "~/src/modules/admin-dashboard/admin-dashboard.types";
import {
  buildAdminDashboardDailyChartPoints,
  buildAdminDashboardDailyChartPointsForIsoDateRange,
  buildAdminDashboardKpiStat,
  buildAdminDashboardMonthlyChartPoints,
  buildAdminDashboardWeeklyOrderPoints,
  isAdminDashboardCustomChartRangeValid,
  resolveAdminDashboardChartStart,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardMonthlyChartStart,
  resolveAdminDashboardYearStart
} from "~/src/modules/admin-dashboard/admin-dashboard.utils";
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants";
import { auditLog } from "~/src/modules/audit-log/audit-log.schema";
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";
import { productCategory } from "~/src/modules/product-category/product-category.schema";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import { product } from "~/src/modules/product/product.schema";
import { resolveProductTitle } from "~/src/modules/product/product.utils";
import { ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS, ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES } from "~/src/modules/user/user.constants";
import { user } from "~/src/modules/user/user.schema";

const ZERO_COUNT = 0;
const ZERO_REVENUE = 0;
const ZERO_AVERAGE = 0;
const EMPTY_LABEL = "";
const FIRST_RESULT_INDEX = 0;

function resolveTopProductName(productTitles: unknown, fallbackTitle: string, locale: string): string {
  if (productTitles === null || productTitles === undefined) {
    return fallbackTitle;
  }

  return resolveProductTitle(productTitles, locale);
}

function resolveTopProductCategoryLabel(categoryTitles: unknown, locale: string): string {
  if (categoryTitles === null || categoryTitles === undefined) {
    return EMPTY_LABEL;
  }

  return resolveCategoryTitle(categoryTitles, locale);
}

function completedRevenueSumQuery(since: Date, until?: Date) {
  const conditions = [eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)];

  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until));
  }

  return db
    .select({ total: sql<number>`coalesce(sum(${order.total}), ${ZERO_REVENUE})` })
    .from(order)
    .where(and(...conditions));
}

function countableOrdersQuery(since: Date, until?: Date) {
  const conditions = [inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES]), gte(order.createdAt, since)];

  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until));
  }

  return db
    .select({ count: count() })
    .from(order)
    .where(and(...conditions));
}

function newCustomersQuery(since: Date, until?: Date) {
  const conditions = [gte(user.createdAt, since)];

  if (until !== undefined) {
    conditions.push(lt(user.createdAt, until));
  }

  return db
    .select({ count: count() })
    .from(user)
    .where(and(...conditions));
}

function pageViewsQuery(since: Date, until?: Date) {
  const conditions = [eq(auditLog.action, AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED), gte(auditLog.createdAt, since)];

  if (until !== undefined) {
    conditions.push(lt(auditLog.createdAt, until));
  }

  return db
    .select({ count: count() })
    .from(auditLog)
    .where(and(...conditions));
}

function averageCompletedOrderValueQuery(since: Date, until?: Date) {
  const conditions = [eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)];

  if (until !== undefined) {
    conditions.push(lt(order.createdAt, until));
  }

  return db
    .select({
      average: sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(${order.total}), ${ZERO_REVENUE}) * 1.0 / count(*)) as integer) else ${ZERO_AVERAGE} end`
    })
    .from(order)
    .where(and(...conditions));
}

function dailyOrderAggregatesQuery(since: Date, until?: Date) {
  const conditions = [gte(order.createdAt, since), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])];

  if (until !== undefined) {
    conditions.push(lte(order.createdAt, until));
  }

  return db
    .select({
      dateKey: sql<string>`strftime('%Y-%m-%d', ${order.createdAt})`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else ${ZERO_REVENUE} end), ${ZERO_REVENUE})`
    })
    .from(order)
    .where(and(...conditions))
    .groupBy(sql`strftime('%Y-%m-%d', ${order.createdAt})`)
    .orderBy(sql`strftime('%Y-%m-%d', ${order.createdAt})`);
}

function monthlyOrderAggregatesQuery(since: Date) {
  return db
    .select({
      monthKey: sql<string>`strftime('%Y-%m', ${order.createdAt})`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else ${ZERO_REVENUE} end), ${ZERO_REVENUE})`
    })
    .from(order)
    .where(and(gte(order.createdAt, since), inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(sql`strftime('%Y-%m', ${order.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${order.createdAt})`);
}

function recentOrdersQuery() {
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
    .orderBy(desc(order.createdAt))
    .limit(ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT);
}

function topProductsQuery() {
  return db
    .select({
      categoryTitles: sql<string | null>`max(${productCategory.titles})`,
      currencyCode: sql<string>`max(${order.currencyCode})`,
      productId: orderItem.productId,
      productTitles: sql<string | null>`max(${product.titles})`,
      revenue: sql<number>`coalesce(sum(${orderItem.total}), ${ZERO_REVENUE})`,
      sold: sql<number>`coalesce(sum(${orderItem.quantity}), ${ZERO_COUNT})`,
      thumbnail: sql<string | null>`max(${orderItem.thumbnail})`,
      title: sql<string>`max(${orderItem.title})`
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .leftJoin(product, eq(product.id, orderItem.productId))
    .leftJoin(categoryOnProduct, and(eq(categoryOnProduct.productId, orderItem.productId), eq(categoryOnProduct.isPrimary, true)))
    .leftJoin(productCategory, eq(productCategory.id, categoryOnProduct.categoryId))
    .where(eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS))
    .groupBy(orderItem.productId)
    .orderBy(sql`coalesce(sum(${orderItem.quantity}), ${ZERO_COUNT}) desc`)
    .limit(ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT);
}

async function getAdminDashboardSnapshot(locale: string): Promise<AdminDashboardSnapshot> {
  const now = new Date();
  const { currentStart, previousEnd, previousStart } = resolveAdminDashboardComparisonPeriod(now);
  const chartStart = resolveAdminDashboardChartStart(now, ADMIN_DASHBOARD_CHART_DAYS_30);
  const monthlyChartStart = resolveAdminDashboardMonthlyChartStart(now, ADMIN_DASHBOARD_CHART_MONTHS_1Y);
  const yearStart = resolveAdminDashboardYearStart(now);

  const [
    [currentRevenueRow],
    [previousRevenueRow],
    [currentOrdersRow],
    [previousOrdersRow],
    [currentCustomersRow],
    [previousCustomersRow],
    [currentViewsRow],
    [previousViewsRow],
    [currentAverageRow],
    [previousAverageRow],
    [yearToDateRevenueRow],
    dailyAggregateRows,
    monthlyAggregateRows,
    recentOrderRows,
    topProductRows
  ] = await db.batch([
    completedRevenueSumQuery(currentStart),
    completedRevenueSumQuery(previousStart, previousEnd),
    countableOrdersQuery(currentStart),
    countableOrdersQuery(previousStart, previousEnd),
    newCustomersQuery(currentStart),
    newCustomersQuery(previousStart, previousEnd),
    pageViewsQuery(currentStart),
    pageViewsQuery(previousStart, previousEnd),
    averageCompletedOrderValueQuery(currentStart),
    averageCompletedOrderValueQuery(previousStart, previousEnd),
    completedRevenueSumQuery(yearStart),
    dailyOrderAggregatesQuery(chartStart),
    monthlyOrderAggregatesQuery(monthlyChartStart),
    recentOrdersQuery(),
    topProductsQuery()
  ]);

  const currencyCode =
    topProductRows[FIRST_RESULT_INDEX]?.currencyCode ?? recentOrderRows[FIRST_RESULT_INDEX]?.currencyCode ?? STORE_CURRENCY_CODE;

  const chartPoints30d = buildAdminDashboardDailyChartPoints({
    days: ADMIN_DASHBOARD_CHART_DAYS_30,
    locale,
    referenceDate: now,
    rows: dailyAggregateRows
  });

  const chartPoints7d = chartPoints30d.slice(-ADMIN_DASHBOARD_CHART_DAYS_7);
  const chartPoints1y = buildAdminDashboardMonthlyChartPoints({
    locale,
    months: ADMIN_DASHBOARD_CHART_MONTHS_1Y,
    referenceDate: now,
    rows: monthlyAggregateRows
  });
  const validTopProductRows = topProductRows.filter((row): row is typeof row & { productId: string } => row.productId !== null);

  return {
    averageOrderValue: buildAdminDashboardKpiStat(currentAverageRow?.average ?? ZERO_AVERAGE, previousAverageRow?.average ?? ZERO_AVERAGE),
    chartPoints1y,
    chartPoints30d,
    chartPoints7d,
    currencyCode,
    customers: buildAdminDashboardKpiStat(currentCustomersRow?.count ?? ZERO_COUNT, previousCustomersRow?.count ?? ZERO_COUNT),
    orders: buildAdminDashboardKpiStat(currentOrdersRow?.count ?? ZERO_COUNT, previousOrdersRow?.count ?? ZERO_COUNT),
    pageViews: buildAdminDashboardKpiStat(currentViewsRow?.count ?? ZERO_COUNT, previousViewsRow?.count ?? ZERO_COUNT),
    recentOrders: recentOrderRows.map((row) =>
      toAdminOrderListItem({
        createdAt: row.createdAt,
        currencyCode: row.currencyCode,
        customerName: row.customerName,
        email: row.email,
        fulfillmentStatus: row.fulfillmentStatus,
        id: row.id,
        itemCount: ZERO_COUNT,
        paymentStatus: row.paymentStatus,
        status: row.status,
        total: row.total,
        userId: row.userId
      })
    ),
    revenue: buildAdminDashboardKpiStat(currentRevenueRow?.total ?? ZERO_REVENUE, previousRevenueRow?.total ?? ZERO_REVENUE),
    topProducts: validTopProductRows.map((row) => ({
      category: resolveTopProductCategoryLabel(row.categoryTitles, locale),
      currencyCode: row.currencyCode ?? currencyCode,
      imageUrl: row.thumbnail ?? undefined,
      name: resolveTopProductName(row.productTitles, row.title, locale),
      productId: row.productId,
      revenueMinorUnits: row.revenue,
      sold: row.sold
    })),
    weeklyOrders: buildAdminDashboardWeeklyOrderPoints({
      locale,
      referenceDate: now,
      rows: dailyAggregateRows
    }),
    yearToDateRevenueMinorUnits: yearToDateRevenueRow?.total ?? ZERO_REVENUE
  };
}

async function getAdminDashboardChartRange(input: AdminDashboardChartRangeInput): Promise<readonly AdminDashboardChartPoint[]> {
  const { endDate, locale, startDate } = input;

  if (!isAdminDashboardCustomChartRangeValid(startDate, endDate)) {
    return [];
  }

  const rangeStart = new Date(parseIsoDateToStartMs(startDate));
  const rangeEnd = new Date(parseIsoDateToEndMs(endDate));
  const dailyAggregateRows = await dailyOrderAggregatesQuery(rangeStart, rangeEnd);

  return buildAdminDashboardDailyChartPointsForIsoDateRange({
    endDate,
    locale,
    rows: dailyAggregateRows,
    startDate
  });
}

export const adminDashboardAccessors = {
  getAdminDashboardChartRange,
  getAdminDashboardSnapshot
};

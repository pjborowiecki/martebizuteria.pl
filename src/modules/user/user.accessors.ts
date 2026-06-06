import { and, count, desc, eq, getTableColumns, inArray, max, sql, type SQL } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/lib/_utils/admin-column-filters.server";
import { buildAdminSearchOrCondition } from "~/src/lib/_utils/admin-search.server";
import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { address } from "~/src/modules/address/address.schema";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { adminCustomersListFiltersNeedOrderRollup, type AdminCustomersListFilters } from "~/src/modules/user/user.admin-list-filters";
import {
  ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS,
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES,
  ADMIN_CUSTOMER_STAT_FILTER,
  type AdminCustomerStatFilter
} from "~/src/modules/user/user.constants";
import { user } from "~/src/modules/user/user.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

export interface AdminCustomersListParams extends ListPaginationParams {
  readonly filters?: AdminCustomersListFilters;
  readonly search?: string;
  readonly statFilter?: AdminCustomerStatFilter;
}

/** Admin: all registered users (customers and admins), newest first — export / legacy full load. */
const getAdminCustomersQuery = db.query.user
  .findMany({
    orderBy: (customers, { desc: descFn }) => [descFn(customers.createdAt)]
  })
  .prepare();

const getAdminCustomerTotalCountQuery = db.select({ count: count() }).from(user).prepare();

function returningCustomerIdsSubquery() {
  return db
    .select({ userId: order.userId })
    .from(order)
    .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(order.userId)
    .having(sql`count(*) >= ${ADMIN_CUSTOMER_MIN_REPEAT_ORDERS}`);
}

function customerOrderRollupSubquery() {
  return db
    .select({
      averageOrderValue:
        sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0) * 1.0 / count(*)) as integer) else 0 end`.as(
          "average_order_value"
        ),
      lastOrderAt: max(order.createdAt).as("last_order_at"),
      totalSpent:
        sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`.as(
          "total_spent"
        ),
      userId: order.userId
    })
    .from(order)
    .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(order.userId)
    .as("customer_order_rollup");
}

function buildAdminCustomersUserConditions(params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">): SQL[] {
  const conditions: SQL[] = [];
  const filters = params.filters ?? {};

  const searchCondition = buildAdminSearchOrCondition(params.search, [user.name, user.email, user.phone, user.id, user.stripeCustomerId]);
  if (searchCondition !== undefined) {
    conditions.push(searchCondition);
  }

  if (params.statFilter === ADMIN_CUSTOMER_STAT_FILTER.RETURNING) {
    conditions.push(inArray(user.id, returningCustomerIdsSubquery()));
  }

  if (filters.role !== undefined) {
    conditions.push(eq(user.role, filters.role));
  }

  if (filters.emailVerified !== undefined) {
    conditions.push(eq(user.emailVerified, filters.emailVerified));
  }

  if (filters.banned !== undefined) {
    conditions.push(eq(user.banned, filters.banned));
  }

  if (filters.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${user.createdAt}`, filters.createdAt));
  }

  return conditions;
}

function buildAdminCustomersRollupConditions(
  filters: AdminCustomersListFilters,
  rollup: ReturnType<typeof customerOrderRollupSubquery>
): SQL[] {
  const conditions: SQL[] = [];
  const coalescedTotalSpent = sql<number>`coalesce(${rollup.totalSpent}, 0)`;
  const coalescedAverageOrderValue = sql<number>`coalesce(${rollup.averageOrderValue}, 0)`;

  if (filters.totalSpent !== undefined) {
    conditions.push(buildAdminNumericFilterSql(coalescedTotalSpent, filters.totalSpent));
  }

  if (filters.averageOrderValue !== undefined) {
    conditions.push(buildAdminNumericFilterSql(coalescedAverageOrderValue, filters.averageOrderValue));
  }

  if (filters.lastOrderAt !== undefined) {
    conditions.push(sql`${rollup.lastOrderAt} is not null`);
    conditions.push(buildAdminDateFilterSql(sql`${rollup.lastOrderAt}`, filters.lastOrderAt));
  }

  return conditions;
}

function combineSqlConditions(conditions: SQL[]): SQL | undefined {
  return conditions.length === EMPTY_LENGTH ? undefined : and(...conditions);
}

function buildAdminCustomersQueryParts(params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">): {
  needsRollupJoin: boolean;
  rollup?: ReturnType<typeof customerOrderRollupSubquery>;
  whereClause: SQL | undefined;
} {
  const filters = params.filters ?? {};
  const needsRollupJoin = adminCustomersListFiltersNeedOrderRollup(filters);
  const userConditions = buildAdminCustomersUserConditions(params);

  if (!needsRollupJoin) {
    return {
      needsRollupJoin,
      whereClause: combineSqlConditions(userConditions)
    };
  }

  const rollup = customerOrderRollupSubquery();
  const rollupConditions = buildAdminCustomersRollupConditions(filters, rollup);

  return {
    needsRollupJoin,
    rollup,
    whereClause: combineSqlConditions([...userConditions, ...rollupConditions])
  };
}

function getCustomerOrderStatsQuery(userIds?: readonly string[]) {
  const conditions = [sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])];

  if (userIds !== undefined && userIds.length > EMPTY_LENGTH) {
    conditions.push(inArray(order.userId, [...userIds]));
  }

  return db
    .select({
      lastOrderAt: max(order.createdAt),
      orderCount: count(),
      totalSpent: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`,
      userId: order.userId
    })
    .from(order)
    .where(and(...conditions))
    .groupBy(order.userId);
}

const getAverageProductsPerOrderQuery = db
  .select({
    value: sql<number>`coalesce(avg(order_quantity_totals.quantity), 0)`
  })
  .from(
    db
      .select({
        quantity: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`.as("quantity")
      })
      .from(order)
      .innerJoin(orderItem, eq(orderItem.orderId, order.id))
      .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
      .groupBy(order.id)
      .as("order_quantity_totals")
  )
  .prepare();

const getAdminCustomerOrderRollupStatsQuery = db
  .select({
    averageLtv: sql<number>`coalesce(avg(customer_order_rollup.completed_revenue), 0)`,
    customersWithOrders: sql<number>`count(*)`,
    repeatCustomers: sql<number>`sum(case when customer_order_rollup.order_count >= ${ADMIN_CUSTOMER_MIN_REPEAT_ORDERS} then 1 else 0 end)`
  })
  .from(
    db
      .select({
        completedRevenue:
          sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`.as(
            "completed_revenue"
          ),
        orderCount: sql<number>`count(*)`.as("order_count"),
        userId: order.userId
      })
      .from(order)
      .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
      .groupBy(order.userId)
      .as("customer_order_rollup")
  )
  .prepare();

function getDefaultCustomerAddressesQuery(userIds?: readonly string[]) {
  const conditions = [eq(address.isDefault, true)];

  if (userIds !== undefined && userIds.length > EMPTY_LENGTH) {
    conditions.push(inArray(address.userId, [...userIds]));
  }

  return db
    .select({
      city: address.city,
      countryCode: address.countryCode,
      province: address.province,
      userId: address.userId
    })
    .from(address)
    .where(and(...conditions));
}

function selectAdminCustomerRows(
  params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">,
  pagination?: Pick<ListPaginationParams, "limit" | "offset">
) {
  const { needsRollupJoin, rollup, whereClause } = buildAdminCustomersQueryParts(params);
  const userColumns = getTableColumns(user);

  if (needsRollupJoin && rollup !== undefined) {
    const baseQuery = db
      .select(userColumns)
      .from(user)
      .leftJoin(rollup, eq(user.id, rollup.userId))
      .where(whereClause)
      .orderBy(desc(user.createdAt));

    if (pagination === undefined) {
      return baseQuery;
    }

    return baseQuery.limit(pagination.limit).offset(pagination.offset);
  }

  const baseQuery = db.select(userColumns).from(user).where(whereClause).orderBy(desc(user.createdAt));

  if (pagination === undefined) {
    return baseQuery;
  }

  return baseQuery.limit(pagination.limit).offset(pagination.offset);
}

async function countAdminCustomerRows(params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">) {
  const { needsRollupJoin, rollup, whereClause } = buildAdminCustomersQueryParts(params);

  if (needsRollupJoin && rollup !== undefined) {
    const [countRow] = await db.select({ count: count() }).from(user).leftJoin(rollup, eq(user.id, rollup.userId)).where(whereClause);

    return countRow?.count ?? ZERO_COUNT;
  }

  const [countRow] = await db.select({ count: count() }).from(user).where(whereClause);
  return countRow?.count ?? ZERO_COUNT;
}

async function getAdminCustomersPage(params: AdminCustomersListParams) {
  const [total, rows] = await Promise.all([
    countAdminCustomerRows(params),
    selectAdminCustomerRows(params, { limit: params.limit, offset: params.offset })
  ]);

  if (rows.length === EMPTY_LENGTH) {
    return { addresses: [], orderStats: [], rows: [], total };
  }

  const userIds = rows.map((row) => row.id);
  const [orderStats, addresses] = await Promise.all([getCustomerOrderStatsQuery(userIds), getDefaultCustomerAddressesQuery(userIds)]);

  return { addresses, orderStats, rows, total };
}

async function getAdminCustomersFilteredList(params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">) {
  const rows = await selectAdminCustomerRows(params);

  if (rows.length === EMPTY_LENGTH) {
    return { addresses: [], orderStats: [], rows: [] };
  }

  const userIds = rows.map((row) => row.id);
  const [orderStats, addresses] = await Promise.all([getCustomerOrderStatsQuery(userIds), getDefaultCustomerAddressesQuery(userIds)]);

  return { addresses, orderStats, rows };
}

function getUserById(id: string) {
  return db.query.user.findFirst({
    where: eq(user.id, id)
  });
}

export const userAccessors = {
  getAdminCustomerOrderRollupStatsQuery,
  getAdminCustomerTotalCountQuery,
  getAdminCustomersFilteredList,
  getAdminCustomersPage,
  getAdminCustomersQuery,
  getAverageProductsPerOrderQuery,
  getCustomerOrderStatsQuery,
  getDefaultCustomerAddressesQuery,
  getUserById
};

import { type SQL, and, count, desc, eq, getTableColumns, gte, inArray, isNotNull, max, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { isoMonthKey } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/modules/_core/utils/column-filters.server"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
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
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES,
  ADMIN_CUSTOMER_STAT_FILTER,
  type AdminCustomerStatFilter,
} from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import { type User } from "~/src/modules/user/user.types"
import { adminCustomersListFiltersNeedOrderRollup } from "~/src/modules/user/user.utils"

const returningCustomerIdsSubquery = () =>
  db
    .select({
      userId: order.userId,
    })
    .from(order)
    .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(order.userId)
    .having(sql`count(*) >= ${ADMIN_CUSTOMER_MIN_REPEAT_ORDERS}`)

const customerOrderRollupSubquery = () =>
  db
    .select({
      averageOrderValue:
        sql<number>`case when count(*) > 0 then cast(round(coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0) * 1.0 / count(*)) as integer) else 0 end`.as(
          "average_order_value",
        ),
      lastOrderAt: max(order.createdAt).as("last_order_at"),
      totalSpent:
        sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`.as(
          "total_spent",
        ),
      userId: order.userId,
    })
    .from(order)
    .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
    .groupBy(order.userId)
    .as("customer_order_rollup")

const buildAdminCustomersUserConditions = (params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">): SQL[] => {
  const conditions: SQL[] = []
  const filters = params.filters ?? {}
  const searchCondition = buildAdminSearchOrCondition(params.search, [user.name, user.email, user.phone, user.id, user.stripeCustomerId])
  if (searchCondition !== undefined) {
    conditions.push(searchCondition)
  }

  if (params.statFilter === ADMIN_CUSTOMER_STAT_FILTER.RETURNING) {
    conditions.push(inArray(user.id, returningCustomerIdsSubquery()))
  }

  if (filters.role !== undefined) {
    conditions.push(eq(user.role, filters.role))
  }

  if (filters.emailVerified !== undefined) {
    conditions.push(eq(user.emailVerified, filters.emailVerified))
  }

  if (filters.banned !== undefined) {
    conditions.push(eq(user.banned, filters.banned))
  }

  if (filters.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${user.createdAt}`, filters.createdAt))
  }

  return conditions
}

const buildAdminCustomersRollupConditions = (
  filters: User["adminCustomersListFilters"],
  rollup: ReturnType<typeof customerOrderRollupSubquery>,
): SQL[] => {
  const conditions: SQL[] = []
  const coalescedTotalSpent = sql<number>`coalesce(${rollup.totalSpent}, 0)`
  const coalescedAverageOrderValue = sql<number>`coalesce(${rollup.averageOrderValue}, 0)`
  if (filters.totalSpent !== undefined) {
    conditions.push(buildAdminNumericFilterSql(coalescedTotalSpent, filters.totalSpent))
  }

  if (filters.averageOrderValue !== undefined) {
    conditions.push(buildAdminNumericFilterSql(coalescedAverageOrderValue, filters.averageOrderValue))
  }

  if (filters.lastOrderAt !== undefined) {
    conditions.push(sql`${rollup.lastOrderAt} is not null`, buildAdminDateFilterSql(sql`${rollup.lastOrderAt}`, filters.lastOrderAt))
  }

  return conditions
}

const combineSqlConditions = (conditions: SQL[]): SQL | undefined => (conditions.length === 0 ? undefined : and(...conditions))

const buildAdminCustomersQueryParts = (
  params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">,
): {
  needsRollupJoin: boolean
  rollup?: ReturnType<typeof customerOrderRollupSubquery>
  whereClause: SQL | undefined
} => {
  const filters = params.filters ?? {}
  const needsRollupJoin = adminCustomersListFiltersNeedOrderRollup(filters)
  const userConditions = buildAdminCustomersUserConditions(params)
  if (!needsRollupJoin) {
    return {
      needsRollupJoin,
      whereClause: combineSqlConditions(userConditions),
    }
  }

  const rollup = customerOrderRollupSubquery()
  const rollupConditions = buildAdminCustomersRollupConditions(filters, rollup)

  return {
    needsRollupJoin,
    rollup,
    whereClause: combineSqlConditions([...userConditions, ...rollupConditions]),
  }
}

export const getCustomerOrderStatsQuery = (userIds?: readonly string[]) => {
  const conditions = [sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])]
  if (userIds !== undefined && userIds.length > 0) {
    conditions.push(inArray(order.userId, [...userIds]))
  }

  return db
    .select({
      lastOrderAt: max(order.createdAt),
      orderCount: count(),
      totalSpent: sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`,
      userId: order.userId,
    })
    .from(order)
    .where(and(...conditions))
    .groupBy(order.userId)
}

export const getDefaultCustomerAddressesQuery = (userIds?: readonly string[]) => {
  const conditions = [eq(address.isDefault, true)]
  if (userIds !== undefined && userIds.length > 0) {
    conditions.push(inArray(address.userId, [...userIds]))
  }

  return db
    .select({
      city: address.city,
      countryCode: address.countryCode,
      province: address.province,
      userId: address.userId,
    })
    .from(address)
    .where(and(...conditions))
}

const selectAdminCustomerRows = (
  params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">,
  pagination?: Pick<ListPaginationParams, "limit" | "offset">,
) => {
  const { needsRollupJoin, rollup, whereClause } = buildAdminCustomersQueryParts(params)
  const userColumns = getTableColumns(user)
  if (needsRollupJoin && rollup !== undefined) {
    const baseQuery = db
      .select(userColumns)
      .from(user)
      .leftJoin(rollup, eq(user.id, rollup.userId))
      .where(whereClause)
      .orderBy(desc(user.createdAt))
    if (pagination === undefined) {
      return baseQuery
    }

    return baseQuery.limit(pagination.limit).offset(pagination.offset)
  }

  const baseQuery = db.select(userColumns).from(user).where(whereClause).orderBy(desc(user.createdAt))
  if (pagination === undefined) {
    return baseQuery
  }

  return baseQuery.limit(pagination.limit).offset(pagination.offset)
}

const countAdminCustomerRows = async (params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">) => {
  const { needsRollupJoin, rollup, whereClause } = buildAdminCustomersQueryParts(params)
  if (needsRollupJoin && rollup !== undefined) {
    const [countRow] = await db
      .select({
        count: count(),
      })
      .from(user)
      .leftJoin(rollup, eq(user.id, rollup.userId))
      .where(whereClause)
    return countRow?.count ?? 0
  }

  const [countRow] = await db
    .select({
      count: count(),
    })
    .from(user)
    .where(whereClause)
  return countRow?.count ?? 0
}

export const getAdminCustomersPage = async (params: AdminCustomersListParams) => {
  const [total, rows] = await Promise.all([
    countAdminCustomerRows(params),
    selectAdminCustomerRows(params, {
      limit: params.limit,
      offset: params.offset,
    }),
  ])

  if (rows.length === 0) {
    return {
      addresses: [],
      orderStats: [],
      rows: [],
      total,
    }
  }

  const userIds = rows.map((row) => row.id)
  const [orderStats, addresses] = await Promise.all([getCustomerOrderStatsQuery(userIds), getDefaultCustomerAddressesQuery(userIds)])

  return {
    addresses,
    orderStats,
    rows,
    total,
  }
}

export const getAdminCustomersFilteredList = async (params: Pick<AdminCustomersListParams, "search" | "statFilter" | "filters">) => {
  const rows = await selectAdminCustomerRows(params)
  if (rows.length === 0) {
    return {
      addresses: [],
      orderStats: [],
      rows: [],
    }
  }

  const userIds = rows.map((row) => row.id)
  const [orderStats, addresses] = await Promise.all([getCustomerOrderStatsQuery(userIds), getDefaultCustomerAddressesQuery(userIds)])

  return {
    addresses,
    orderStats,
    rows,
  }
}

export const getUserById = (id: string) =>
  db.query.user.findFirst({
    where: eq(user.id, id),
  })

export interface AdminCustomersListParams extends ListPaginationParams {
  readonly filters?: User["adminCustomersListFilters"] | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminCustomerStatFilter | undefined
}

export const getAdminCustomersQuery = db.query.user
  .findMany({
    orderBy: (customers, { desc: descFn }) => [descFn(customers.createdAt)],
  })
  .prepare()
export const getAdminCustomerTotalCountQuery = db
  .select({
    count: count(),
  })
  .from(user)
  .prepare()
const orderQuantityTotalsSubquery = db
  .select({
    quantity: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`.as("quantity"),
  })
  .from(order)
  .innerJoin(orderItem, eq(orderItem.orderId, order.id))
  .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
  .groupBy(order.id)
  .as("order_quantity_totals")

export const getAverageProductsPerOrderQuery = db
  .select({
    value: sql<number>`coalesce(avg(order_quantity_totals.quantity), 0)`,
  })
  .from(orderQuantityTotalsSubquery)
  .prepare()
const customerOrderRollupStatsSubquery = db
  .select({
    completedRevenue:
      sql<number>`coalesce(sum(case when ${order.status} = ${ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS} then ${order.total} else 0 end), 0)`.as(
        "completed_revenue",
      ),
    orderCount: sql<number>`count(*)`.as("order_count"),
    userId: order.userId,
  })
  .from(order)
  .where(and(sql`${order.userId} is not null`, inArray(order.status, [...ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES])))
  .groupBy(order.userId)
  .as("customer_order_rollup")

export const getAdminCustomerOrderRollupStatsQuery = db
  .select({
    averageLtv: sql<number>`coalesce(avg(customer_order_rollup.completed_revenue), 0)`,
    customersWithOrders: sql<number>`count(*)`,
    repeatCustomers: sql<number>`sum(case when customer_order_rollup.order_count >= ${ADMIN_CUSTOMER_MIN_REPEAT_ORDERS} then 1 else 0 end)`,
  })
  .from(customerOrderRollupStatsSubquery)
  .prepare()

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
      monthKey: isoMonthKey(order.createdAt),
    })
    .from(order)
    .where(and(eq(order.userId, userId), eq(order.status, ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS), gte(order.createdAt, since)))
    .groupBy(isoMonthKey(order.createdAt))
    .orderBy(isoMonthKey(order.createdAt))

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
      paymentStatus: sql<(typeof payment.$inferSelect)["status"] | null>`${payment.status}`.as("payment_status"),
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

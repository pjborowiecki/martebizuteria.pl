import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  newCustomersQuery,
  orderAggregatesQuery,
  pageViewsQuery,
  recentOrdersQuery,
  resolveTopProductCategoryLabel,
  resolveTopProductName,
  salesTotalsQuery,
  topProductsQuery,
} from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
  ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import {
  buildAdminDashboardChartPoints,
  buildAdminDashboardKpiStat,
  buildAdminDashboardWeeklyOrderPoints,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardDays,
  resolveAdminDashboardMonths,
  resolveAdminDashboardYearStart,
} from "~/src/modules/admin-dashboard/admin-dashboard.utils"
import { adminDashboardZodSchemas } from "~/src/modules/admin-dashboard/admin-dashboard.zod"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

export const getDashboardSnapshot = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof adminDashboardZodSchemas.snapshotInput>) => adminDashboardZodSchemas.snapshotInput.parse(input))
  .handler(async ({ data: { locale } }): Promise<AdminDashboard["snapshot"]> => {
    const now = new Date()
    const { currentStart, previousEnd, previousStart } = resolveAdminDashboardComparisonPeriod(now)
    const days = resolveAdminDashboardDays(now, ADMIN_DASHBOARD_CHART_DAYS_30)
    const months = resolveAdminDashboardMonths(now, ADMIN_DASHBOARD_CHART_MONTHS_1Y)
    const yearStart = resolveAdminDashboardYearStart(now)

    const [
      [currentSalesRow],
      [previousSalesRow],
      [currentCustomersRow],
      [previousCustomersRow],
      [currentViewsRow],
      [previousViewsRow],
      [yearToDateSalesRow],
      dailyAggregateRows,
      monthlyAggregateRows,
      recentOrderRows,
      topProductRows,
    ] = await db.batch([
      salesTotalsQuery(currentStart),
      salesTotalsQuery(previousStart, previousEnd),
      newCustomersQuery(currentStart),
      newCustomersQuery(previousStart, previousEnd),
      pageViewsQuery(currentStart),
      pageViewsQuery(previousStart, previousEnd),
      salesTotalsQuery(yearStart),
      orderAggregatesQuery(days),
      orderAggregatesQuery(months),
      recentOrdersQuery(),
      topProductsQuery(),
    ])

    const currencyCode = topProductRows[0]?.currencyCode ?? recentOrderRows[0]?.currencyCode ?? STORE_CURRENCY_CODE

    const chartPoints30d = buildAdminDashboardChartPoints({
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      locale,
      periods: days.periods,
      rows: dailyAggregateRows,
    })

    const chartPoints7d = chartPoints30d.slice(-ADMIN_DASHBOARD_CHART_DAYS_7)
    const chartPoints1y = buildAdminDashboardChartPoints({
      labelFormat: ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
      locale,
      periods: months.periods,
      rows: monthlyAggregateRows,
    })

    const validTopProductRows = topProductRows.filter((row): row is typeof row & { productId: string } => row.productId !== null)

    return {
      averageOrderValue: buildAdminDashboardKpiStat(currentSalesRow?.averageOrderValue ?? 0, previousSalesRow?.averageOrderValue ?? 0),
      chartPoints1y,
      chartPoints30d,
      chartPoints7d,
      currencyCode,
      customers: buildAdminDashboardKpiStat(currentCustomersRow?.count ?? 0, previousCustomersRow?.count ?? 0),
      orders: buildAdminDashboardKpiStat(currentSalesRow?.orders ?? 0, previousSalesRow?.orders ?? 0),
      pageViews: buildAdminDashboardKpiStat(currentViewsRow?.count ?? 0, previousViewsRow?.count ?? 0),
      recentOrders: recentOrderRows.map((row) =>
        toAdminOrderListItem({
          createdAt: row.createdAt,
          currencyCode: row.currencyCode,
          customerName: row.customerName,
          email: row.email,
          fulfillmentStatus: row.fulfillmentStatus,
          id: row.id,
          itemCount: 0,
          metadata: row.metadata,
          paymentStatus: row.paymentStatus,
          status: row.status,
          total: row.total,
          userId: row.userId,
        }),
      ),
      revenue: buildAdminDashboardKpiStat(currentSalesRow?.revenue ?? 0, previousSalesRow?.revenue ?? 0),
      topProducts: validTopProductRows.map((row) => ({
        category: resolveTopProductCategoryLabel(row.categoryTitles, locale),
        currencyCode: row.currencyCode,
        imageUrl: row.thumbnail ?? undefined,
        name: resolveTopProductName(row.productTitles, row.title, locale),
        productId: row.productId,
        revenueMinorUnits: row.revenue,
        sold: row.sold,
      })),
      weeklyOrders: buildAdminDashboardWeeklyOrderPoints({
        locale,
        periods: days.periods.slice(-ADMIN_DASHBOARD_CHART_DAYS_7),
        rows: dailyAggregateRows,
      }),
      yearToDateRevenueMinorUnits: yearToDateSalesRow?.revenue ?? 0,
    }
  })

export const getDashboardSnapshotQuery = (input: zod.input<typeof adminDashboardZodSchemas.snapshotInput>) =>
  queryOptions({
    queryFn: () => getDashboardSnapshot({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.SNAPSHOT, input.locale],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })

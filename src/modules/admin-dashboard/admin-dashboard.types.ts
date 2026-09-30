import { type z } from "zod/v4"

import { type adminDashboardZodSchemas } from "~/src/modules/admin-dashboard/admin-dashboard.zod"
import { type Order } from "~/src/modules/order/order.types"

interface AdminDashboardKpiStat {
  readonly current: number
  readonly previous: number
  readonly trendPercent: number
}

interface AdminDashboardChartPoint {
  readonly dateKey: string
  readonly label: string
  readonly orders: number
  readonly revenue: number
}

interface AdminDashboardWeeklyOrderPoint {
  readonly dateKey: string
  readonly dayLabel: string
  readonly orders: number
}

interface AdminDashboardTopProductItem {
  readonly category: string
  readonly currencyCode: string
  readonly imageUrl: string | undefined
  readonly name: string
  readonly productId: string
  readonly revenueMinorUnits: number
  readonly sold: number
}

interface AdminDashboardSnapshot {
  readonly averageOrderValue: AdminDashboardKpiStat
  readonly chartPoints1y: readonly AdminDashboardChartPoint[]
  readonly chartPoints30d: readonly AdminDashboardChartPoint[]
  readonly chartPoints7d: readonly AdminDashboardChartPoint[]
  readonly currencyCode: string
  readonly customers: AdminDashboardKpiStat
  readonly orders: AdminDashboardKpiStat
  readonly pageViews: AdminDashboardKpiStat
  readonly recentOrders: readonly Order["adminListItem"][]
  readonly revenue: AdminDashboardKpiStat
  readonly topProducts: readonly AdminDashboardTopProductItem[]
  readonly weeklyOrders: readonly AdminDashboardWeeklyOrderPoint[]
  readonly yearToDateRevenueMinorUnits: number
}

export interface AdminDashboard {
  chartPoint: AdminDashboardChartPoint
  chartRangeInput: z.infer<(typeof adminDashboardZodSchemas)["chartRangeInput"]>
  kpiStat: AdminDashboardKpiStat
  snapshot: AdminDashboardSnapshot
  snapshotInput: z.infer<(typeof adminDashboardZodSchemas)["snapshotInput"]>
  topProductItem: AdminDashboardTopProductItem
  weeklyOrderPoint: AdminDashboardWeeklyOrderPoint
}

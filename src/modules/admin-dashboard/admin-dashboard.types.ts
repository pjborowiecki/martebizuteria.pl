import { type Order } from "~/src/modules/order/order.types"

export interface AdminDashboardKpiStat {
  readonly current: number
  readonly previous: number
  readonly trendPercent: number
}

export interface AdminDashboardChartPoint {
  readonly dateKey: string
  readonly label: string
  readonly orders: number
  readonly revenue: number
}

export interface AdminDashboardWeeklyOrderPoint {
  readonly dateKey: string
  readonly dayLabel: string
  readonly orders: number
}

export interface AdminDashboardTopProductItem {
  readonly category: string
  readonly currencyCode: string
  readonly imageUrl: string | undefined
  readonly name: string
  readonly productId: string
  readonly revenueMinorUnits: number
  readonly sold: number
}

export interface AdminDashboardChartRangeInput {
  readonly endDate: string
  readonly locale: string
  readonly startDate: string
}

export interface AdminDashboardSnapshot {
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

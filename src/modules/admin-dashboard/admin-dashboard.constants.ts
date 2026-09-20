import { QUERY_KEY_ROOTS } from "~/src/modules/_core/constants/query-keys"

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

export const ADMIN_DASHBOARD_QUERY_STALE_MS = 60_000

export const ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT = 5

export const ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT = 4

export const ADMIN_DASHBOARD_CHART_DAYS_7 = 7

export const ADMIN_DASHBOARD_CHART_DAYS_30 = 30

export const ADMIN_DASHBOARD_CHART_MONTHS_1Y = 12

/** KPI comparison window (matches “vs last month” copy). */
export const ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS = 30

export const ADMIN_DASHBOARD_MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export const ADMIN_DASHBOARD_TREND_PERCENT_SCALE = 100

export const ADMIN_DASHBOARD_QUERY_KEYS = {
  CHART_RANGE: [...QUERY_KEY_ROOTS.ADMIN, "dashboard", "chart-range"] as const,
  SNAPSHOT: [...QUERY_KEY_ROOTS.ADMIN, "dashboard", "snapshot"] as const,
} as const

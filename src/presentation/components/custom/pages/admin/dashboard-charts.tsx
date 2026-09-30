import { type JSX, useCallback, useMemo } from "react"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { formatPrice, minorUnitsPerMajor } from "~/src/modules/_core/utils/currency"
import { parseIsoDateToLocalDate } from "~/src/modules/_core/utils/iso-date"
import { ADMIN_DASHBOARD_CHART_DAYS_30, ADMIN_DASHBOARD_CHART_DAYS_7 } from "~/src/modules/admin-dashboard/admin-dashboard.constants"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { DashboardChartRangeControls } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-chart-range-controls"
import { DashboardTrendBadge } from "~/src/presentation/components/custom/pages/admin/dashboard/dashboard-trend-badge"
import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"
import { useDashboardChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

import { ROUTES } from "~/src/routes"

export const DashboardCharts = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const { data: snapshot } = useAdminDashboardSnapshot()
  const { applyCustomRange, chartData, chartRange, clearCustomRange, customRange, isCustomLoading, selectPresetRange } =
    useDashboardChartRange()
  const revenueChartConfig: ChartConfig = useMemo(
    () => ({
      revenue: {
        color: "oklch(0.205 0 0)",
        label: t("dashboard.chart.revenueLabel"),
      },
    }),
    [t],
  )

  const chartTooltipContent = useMemo(() => <ChartTooltipContent />, [])
  const formatIsoDateLabel = useCallback(
    (isoDate: string) =>
      format.dateTime(parseIsoDateToLocalDate(isoDate), {
        dateStyle: "medium",
      }),
    [format],
  )

  const chartDescription = useMemo(() => {
    switch (chartRange) {
      case "7d": {
        return t("dashboard.chart.description7d", {
          days: ADMIN_DASHBOARD_CHART_DAYS_7,
        })
      }
      case "30d": {
        return t("dashboard.chart.description30d", {
          days: ADMIN_DASHBOARD_CHART_DAYS_30,
        })
      }
      case "1y": {
        return t("dashboard.chart.description1y")
      }
      case "custom": {
        if (customRange === undefined) {
          return t("dashboard.chart.descriptionCustomIdle")
        }

        return t("dashboard.chart.descriptionCustom", {
          endDate: formatIsoDateLabel(customRange.endDate),
          startDate: formatIsoDateLabel(customRange.startDate),
        })
      }
    }
  }, [chartRange, customRange, formatIsoDateLabel, t])

  const formatYAxisTick = useCallback(
    (value: number) =>
      format.number(value / minorUnitsPerMajor(snapshot.currencyCode), {
        maximumFractionDigits: REVENUE_AXIS_MAX_FRACTION_DIGITS,
        notation: "compact",
      }),
    [format, snapshot.currencyCode],
  )

  const chartDataPoints = useMemo(() => [...chartData], [chartData])

  return (
    <div className="grid gap-5 xl:grid-cols-4">
      <Card className="border-border/40 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent shadow-none xl:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{t("dashboard.chart.title")}</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{chartDescription}</p>
            </div>
            <DashboardChartRangeControls
              chartRange={chartRange}
              customRange={customRange}
              onApplyCustomRange={applyCustomRange}
              onClearCustomRange={clearCustomRange}
              onSelectRange={selectPresetRange}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ChartContainer
            config={revenueChartConfig}
            className={`aspect-auto h-[280px] w-full transition-opacity ${isCustomLoading ? "opacity-60" : "opacity-100"}`}
          >
            <AreaChart data={chartDataPoints} margin={REVENUE_CHART_MARGIN}>
              {REVENUE_CHART_DEFS}
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} tick={TICK_FONT_12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={TICK_FONT_12} tickFormatter={formatYAxisTick} />
              <ChartTooltip cursor={CHART_TOOLTIP_CURSOR} content={chartTooltipContent} />
              <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-border/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.avgOrder.label")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatPrice(snapshot.averageOrderValue.current, snapshot.currencyCode, locale)}
            </p>
            <DashboardTrendBadge className="mt-1.5" trendPercent={snapshot.averageOrderValue.trendPercent} />
          </CardContent>
        </Card>

        <WeeklyOrdersChart />

        <Card className="bg-foreground text-background shadow-none">
          <CardContent className="p-5">
            <p className="text-xs text-background/50">{t("dashboard.totalSales.label")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {formatPrice(snapshot.yearToDateRevenueMinorUnits, snapshot.currencyCode, locale)}
            </p>
            <LocalizedLink
              to={ROUTES.ADMIN_ORDERS}
              className="mt-3 inline-block text-xs text-background/60 underline underline-offset-2 transition-colors hover:text-background/80"
            >
              {t("dashboard.totalSales.period")}
            </LocalizedLink>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const WeeklyOrdersChart = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { data: snapshot } = useAdminDashboardSnapshot()
  const ordersChartConfig: ChartConfig = useMemo(
    () => ({
      orders: {
        color: "oklch(0.205 0 0)",
        label: t("dashboard.weeklyOrders.seriesLabel"),
      },
    }),
    [t],
  )

  const chartTooltipContent = useMemo(() => <ChartTooltipContent hideLabel />, [])
  const weeklyOrdersData = useMemo(() => [...snapshot.weeklyOrders], [snapshot.weeklyOrders])

  return (
    <Card className="border-border/40 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.weeklyOrders.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ordersChartConfig} className="aspect-auto h-[148px] w-full">
          <BarChart data={weeklyOrdersData} margin={ORDERS_CHART_MARGIN}>
            <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tickMargin={8} tick={TICK_FONT_11} />
            <YAxis tickLine={false} axisLine={false} tick={false} />
            <ChartTooltip cursor={false} content={chartTooltipContent} />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={BAR_RADIUS} barSize={32} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const REVENUE_CHART_MARGIN = {
  bottom: 0,
  left: -12,
  right: 8,
  top: 8,
}

const ORDERS_CHART_MARGIN = {
  bottom: 0,
  left: -24,
  right: 0,
  top: 4,
}

const TICK_FONT_12 = {
  fontSize: 12,
}

const TICK_FONT_11 = {
  fontSize: 11,
}

const CHART_TOOLTIP_CURSOR = {
  stroke: "var(--color-border)",
  strokeDasharray: "4 4",
}

const BAR_RADIUS_TOP = 4

const BAR_RADIUS_BOTTOM = 0

const BAR_RADIUS: [number, number, number, number] = [BAR_RADIUS_TOP, BAR_RADIUS_TOP, BAR_RADIUS_BOTTOM, BAR_RADIUS_BOTTOM]

const REVENUE_AXIS_MAX_FRACTION_DIGITS = 0

const REVENUE_CHART_DEFS = (
  <defs>
    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
      <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.01} />
    </linearGradient>
  </defs>
)

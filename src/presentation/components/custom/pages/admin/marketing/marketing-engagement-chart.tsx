import { type JSX, useCallback, useMemo } from "react"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useTranslations } from "use-intl"

import { ENGAGEMENT_DATA } from "~/src/data/marketing-data"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"
export const MarketingEngagementChart = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const chartConfig: ChartConfig = useMemo(
    () => ({
      clickRate: {
        color: "oklch(0.398 0.07 227.392)",
        label: "Click Rate",
      },
      openRate: {
        color: "oklch(0.6 0.118 184.704)",
        label: "Open Rate",
      },
    }),
    [],
  )
  const chartMargin = useMemo(
    () => ({
      bottom: 0,
      left: -12,
      right: 8,
      top: 8,
    }),
    [],
  )
  const tickFont = useMemo(
    () => ({
      fontSize: 11,
    }),
    [],
  )
  const formatYAxis = useCallback((value: number) => `${value}%`, [])
  const tooltipContent = useMemo(() => <ChartTooltipContent />, [])
  return (
    <Card className="border-border/40 bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t("marketing.chart.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("marketing.chart.description")}</p>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={ENGAGEMENT_DATA} margin={chartMargin}>
            <ChartGradients />
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} tick={tickFont} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={tickFont} tickFormatter={formatYAxis} />
            <ChartTooltip content={tooltipContent} />
            <Area dataKey="openRate" type="monotone" fill="url(#fillOpen)" stroke="var(--color-openRate)" strokeWidth={1.5} dot={false} />
            <Area
              dataKey="clickRate"
              type="monotone"
              fill="url(#fillClick)"
              stroke="var(--color-clickRate)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
const ChartGradients = (): JSX.Element => (
  <defs>
    <linearGradient id="fillOpen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--color-openRate)" stopOpacity={0.1} />
      <stop offset="100%" stopColor="var(--color-openRate)" stopOpacity={0.01} />
    </linearGradient>
    <linearGradient id="fillClick" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--color-clickRate)" stopOpacity={0.1} />
      <stop offset="100%" stopColor="var(--color-clickRate)" stopOpacity={0.01} />
    </linearGradient>
  </defs>
)

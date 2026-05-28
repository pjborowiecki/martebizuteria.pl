import type { JSX } from "react";

import { ArrowUpRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/components/shadcn/chart";

const REVENUE_DATA = [
  { month: "Jan", orders: 64, revenue: 18_600 },
  { month: "Feb", orders: 78, revenue: 22_400 },
  { month: "Mar", orders: 71, revenue: 19_800 },
  { month: "Apr", orders: 96, revenue: 28_200 },
  { month: "May", orders: 108, revenue: 32_100 },
  { month: "Jun", orders: 94, revenue: 27_800 },
  { month: "Jul", orders: 118, revenue: 34_500 },
  { month: "Aug", orders: 106, revenue: 31_200 },
  { month: "Sep", orders: 132, revenue: 38_400 },
  { month: "Oct", orders: 142, revenue: 42_900 }
];

const WEEKLY_DATA = [
  { day: "Mon", orders: 28 },
  { day: "Tue", orders: 42 },
  { day: "Wed", orders: 38 },
  { day: "Thu", orders: 56 },
  { day: "Fri", orders: 44 },
  { day: "Sat", orders: 68 },
  { day: "Sun", orders: 52 }
];

const revenueChartConfig: ChartConfig = {
  revenue: { color: "oklch(0.205 0 0)", label: "Revenue" }
};

const ordersChartConfig: ChartConfig = {
  orders: { color: "oklch(0.205 0 0)", label: "Orders" }
};

const REVENUE_CHART_MARGIN = { bottom: 0, left: -12, right: 8, top: 8 };
const ORDERS_CHART_MARGIN = { bottom: 0, left: -24, right: 0, top: 4 };
const TICK_FONT_12 = { fontSize: 12 };
const TICK_FONT_11 = { fontSize: 11 };
const CHART_TOOLTIP_CURSOR = { stroke: "var(--color-border)", strokeDasharray: "4 4" };
const CHART_TOOLTIP_CONTENT = <ChartTooltipContent />;
const CHART_TOOLTIP_CONTENT_HIDE_LABEL = <ChartTooltipContent hideLabel />;

const BAR_RADIUS_TOP = 4;
const BAR_RADIUS_BOTTOM = 0;
const BAR_RADIUS: [number, number, number, number] = [BAR_RADIUS_TOP, BAR_RADIUS_TOP, BAR_RADIUS_BOTTOM, BAR_RADIUS_BOTTOM];

const REVENUE_DIVISOR = 1000;
const REVENUE_DECIMALS = 0;
const FORMAT_Y_AXIS_TICK = (v: number) => `$${(v / REVENUE_DIVISOR).toFixed(REVENUE_DECIMALS)}k`;

const REVENUE_CHART_DEFS = (
  <defs>
    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
      <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.01} />
    </linearGradient>
  </defs>
);

export function DashboardCharts(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="grid gap-5 xl:grid-cols-4">
      <Card className="border-border/40 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent shadow-none xl:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{t("dashboard.chart.title")}</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("dashboard.chart.description")}</p>
            </div>
            <div className="flex rounded-lg border border-border/50 p-0.5">
              <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted-foreground">
                {t("dashboard.chart.last7")}
              </Button>
              <Button variant="secondary" size="sm" className="h-7 px-3 text-xs">
                {t("dashboard.chart.last30")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ChartContainer config={revenueChartConfig} className="aspect-auto h-[280px] w-full">
            <AreaChart data={REVENUE_DATA} margin={REVENUE_CHART_MARGIN}>
              {REVENUE_CHART_DEFS}
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} tick={TICK_FONT_12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={TICK_FONT_12} tickFormatter={FORMAT_Y_AXIS_TICK} />
              <ChartTooltip cursor={CHART_TOOLTIP_CURSOR} content={CHART_TOOLTIP_CONTENT} />
              <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-border/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.avgOrder.label")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{t("dashboard.avgOrder.value")}</p>
            <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
              <ArrowUpRight className="size-3" strokeWidth={2} />
              {t("dashboard.avgOrder.trend")}
            </span>
          </CardContent>
        </Card>

        <WeeklyOrdersChart />

        <Card className="bg-foreground text-background shadow-none">
          <CardContent className="p-5">
            <p className="text-xs text-background/50">{t("dashboard.totalSales.label")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t("dashboard.totalSales.value")}</p>
            <button
              type="button"
              className="mt-3 text-xs text-background/60 underline underline-offset-2 transition-colors hover:text-background/80"
            >
              {t("dashboard.totalSales.period")}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WeeklyOrdersChart(): JSX.Element {
  const t = useTranslations("admin");
  return (
    <Card className="border-border/40 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.chart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ordersChartConfig} className="aspect-auto h-[148px] w-full">
          <BarChart data={WEEKLY_DATA} margin={ORDERS_CHART_MARGIN}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={TICK_FONT_11} />
            <YAxis tickLine={false} axisLine={false} tick={false} />
            <ChartTooltip cursor={false} content={CHART_TOOLTIP_CONTENT_HIDE_LABEL} />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={BAR_RADIUS} barSize={32} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

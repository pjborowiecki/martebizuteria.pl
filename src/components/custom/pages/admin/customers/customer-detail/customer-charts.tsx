import { type JSX, useCallback, useMemo } from "react";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/components/shadcn/chart";

import { CATEGORY_BREAKDOWN, SPENDING_DATA } from "~/src/data/customer-detail-data";

export function CustomerCharts(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  const spendingConfig: ChartConfig = useMemo(
    () => ({
      amount: { color: "hsl(var(--foreground))", label: "Spending" }
    }),
    []
  );

  const categoryConfig: ChartConfig = useMemo(
    () => ({
      amount: { color: "hsl(var(--foreground))", label: "Revenue" }
    }),
    []
  );

  const tickConfig = useMemo(() => ({ fill: "hsl(var(--muted-foreground) / 0.5)", fontSize: 11 }), []);
  const categoryTickConfig = useMemo(() => ({ fill: "hsl(var(--muted-foreground))", fontSize: 12 }), []);
  const chartMargin = useMemo(() => ({ bottom: 0, left: -20, right: 4, top: 4 }), []);
  const barChartMargin = useMemo(() => ({ bottom: 0, left: 0, right: 4, top: 0 }), []);
  const TICK_DIVISOR = 1000;
  const TICK_DECIMALS = 0;
  const tickFormatter = useCallback((v: number) => `$${(v / TICK_DIVISOR).toFixed(TICK_DECIMALS)}k`, []);

  const RADIUS_RIGHT = 4;
  const RADIUS_OTHER = 0;
  const barRadius = useMemo<[number, number, number, number]>(() => [RADIUS_OTHER, RADIUS_RIGHT, RADIUS_RIGHT, RADIUS_OTHER], []);
  const tooltipContent = useMemo(() => <ChartTooltipContent />, []);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("spending.title")}</p>
              <p className="text-[12px] text-muted-foreground">{t("spending.subtitle")}</p>
            </div>
          </div>
          <ChartContainer config={spendingConfig} className="h-[220px] w-full">
            <SpendingChart margin={chartMargin} tickConfig={tickConfig} tickFormatter={tickFormatter} tooltipContent={tooltipContent} />
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-medium">{t("categoryBreakdown.title")}</p>
          <ChartContainer config={categoryConfig} className="h-[220px] w-full">
            <CategoryBreakdownChart
              margin={barChartMargin}
              tickConfig={categoryTickConfig}
              barRadius={barRadius}
              tooltipContent={tooltipContent}
            />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function SpendingChart({
  margin,
  tickConfig,
  tickFormatter,
  tooltipContent
}: Readonly<{
  margin: object;
  tickConfig: object;
  tickFormatter: (v: number) => string;
  tooltipContent: JSX.Element;
}>): JSX.Element {
  return (
    <AreaChart data={SPENDING_DATA} margin={margin}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tickConfig} />
      <YAxis tickLine={false} axisLine={false} tick={tickConfig} tickFormatter={tickFormatter} />
      <ChartTooltip content={tooltipContent} />
      <ChartGradients />
      <Area type="monotone" dataKey="amount" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#spending-fill)" dot={false} />
    </AreaChart>
  );
}

function CategoryBreakdownChart({
  margin,
  tickConfig,
  barRadius,
  tooltipContent
}: Readonly<{
  margin: object;
  tickConfig: object;
  barRadius: [number, number, number, number];
  tooltipContent: JSX.Element;
}>): JSX.Element {
  return (
    <BarChart data={CATEGORY_BREAKDOWN} layout="vertical" margin={margin}>
      <XAxis type="number" hide />
      <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} tick={tickConfig} width={80} />
      <ChartTooltip content={tooltipContent} />
      <Bar dataKey="amount" fill="hsl(var(--foreground))" radius={barRadius} barSize={20} />
    </BarChart>
  );
}

function ChartGradients(): JSX.Element {
  return (
    <defs>
      <linearGradient id="spending-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
        <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

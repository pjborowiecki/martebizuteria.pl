import { type JSX, useCallback, useMemo } from "react"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, type TooltipValueType, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "use-intl/react"

import { formatMinorUnitsAsCompactNumber } from "~/src/modules/_core/utils/currency"
import { DEFAULT_ADMIN_CUSTOMER_CURRENCY } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"

import { AdminChartMoneyTooltipRow } from "~/src/presentation/components/custom/pages/admin/admin-chart-money-tooltip-row"

export const CustomerCharts = ({ customer }: CustomerChartsProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const locale = useLocale()
  const spendingConfig: ChartConfig = useMemo(
    () => ({
      amount: {
        color: "var(--foreground)",
        label: t("spending.seriesLabel"),
      },
    }),
    [t],
  )

  const categoryConfig: ChartConfig = useMemo(
    () => ({
      amount: {
        color: "var(--foreground)",
        label: t("categoryBreakdown.seriesLabel"),
      },
    }),
    [t],
  )

  const tickFormatter = useCallback(
    (value: number) => formatMinorUnitsAsCompactNumber(value, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale),
    [locale],
  )

  const formatSpendingTooltip = useCallback(
    (value: TooltipValueType | undefined) => (
      <AdminChartMoneyTooltipRow
        amount={Number(value)}
        currencyCode={DEFAULT_ADMIN_CUSTOMER_CURRENCY}
        label={t("spending.seriesLabel")}
        seriesKey="amount"
      />
    ),
    [t],
  )

  const formatCategoryTooltip = useCallback(
    (value: TooltipValueType | undefined) => (
      <AdminChartMoneyTooltipRow
        amount={Number(value)}
        currencyCode={DEFAULT_ADMIN_CUSTOMER_CURRENCY}
        label={t("categoryBreakdown.seriesLabel")}
        seriesKey="amount"
      />
    ),
    [t],
  )

  const spendingTooltipContent = useMemo(() => <ChartTooltipContent formatter={formatSpendingTooltip} />, [formatSpendingTooltip])
  const categoryTooltipContent = useMemo(() => <ChartTooltipContent formatter={formatCategoryTooltip} />, [formatCategoryTooltip])
  const hasSpendingData = customer.monthlySpending.some((entry) => entry.amount > 0)
  const hasCategoryData = customer.categoryBreakdown.length > 0

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">{t("spending.title")}</p>
            <p className="text-[12px] text-muted-foreground">{t("spending.subtitle")}</p>
          </div>
          {hasSpendingData ? (
            <ChartContainer config={spendingConfig} className="h-[220px] w-full">
              <SpendingChart data={customer.monthlySpending} tickFormatter={tickFormatter} tooltipContent={spendingTooltipContent} />
            </ChartContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{t("spending.empty")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">{t("categoryBreakdown.title")}</p>
            <p className="text-[12px] text-muted-foreground">{t("categoryBreakdown.subtitle")}</p>
          </div>
          {hasCategoryData ? (
            <ChartContainer config={categoryConfig} className="h-[220px] w-full">
              <CategoryBreakdownChart data={customer.categoryBreakdown} tooltipContent={categoryTooltipContent} />
            </ChartContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{t("categoryBreakdown.empty")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const SpendingChart = ({
  data,
  tickFormatter,
  tooltipContent,
}: Readonly<{
  data: User["adminCustomerDetail"]["monthlySpending"]
  tickFormatter: (value: number) => string
  tooltipContent: JSX.Element
}>): JSX.Element => (
  <AreaChart data={data} margin={SPENDING_CHART_MARGIN}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={TICK_FONT_11} />
    <YAxis tickLine={false} axisLine={false} tick={TICK_FONT_11} tickFormatter={tickFormatter} />
    <ChartTooltip content={tooltipContent} />
    {SPENDING_CHART_DEFS}
    <Area type="monotone" dataKey="amount" stroke="var(--color-amount)" strokeWidth={1.5} fill="url(#spending-fill)" dot={false} />
  </AreaChart>
)

const CategoryBreakdownChart = ({
  data,
  tooltipContent,
}: Readonly<{
  data: User["adminCustomerDetail"]["categoryBreakdown"]
  tooltipContent: JSX.Element
}>): JSX.Element => (
  <BarChart data={data} layout="vertical" margin={CATEGORY_CHART_MARGIN}>
    <XAxis type="number" hide />
    <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} tick={TICK_FONT_12} width={80} />
    <ChartTooltip content={tooltipContent} />
    <Bar dataKey="amount" fill="var(--color-amount)" radius={BAR_RADIUS} barSize={20} />
  </BarChart>
)

const SPENDING_CHART_DEFS = (
  <defs>
    <linearGradient id="spending-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.12} />
      <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
    </linearGradient>
  </defs>
)

const SPENDING_CHART_MARGIN = {
  bottom: 0,
  left: -12,
  right: 4,
  top: 4,
}

const CATEGORY_CHART_MARGIN = {
  bottom: 0,
  left: 0,
  right: 4,
  top: 0,
}

const TICK_FONT_11 = {
  fontSize: 11,
}

const TICK_FONT_12 = {
  fontSize: 12,
}

const BAR_RADIUS_END = 4

const BAR_RADIUS_START = 0

const BAR_RADIUS: [number, number, number, number] = [BAR_RADIUS_START, BAR_RADIUS_END, BAR_RADIUS_END, BAR_RADIUS_START]

interface CustomerChartsProps {
  readonly customer: User["adminCustomerDetail"]
}

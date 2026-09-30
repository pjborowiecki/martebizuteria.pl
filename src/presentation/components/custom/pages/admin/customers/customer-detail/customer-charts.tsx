import { type JSX, useCallback, useMemo } from "react"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFormatter, useTranslations } from "use-intl/react"

import { DEFAULT_ADMIN_CUSTOMER_CURRENCY } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"

export const CustomerCharts = ({ customer }: CustomerChartsProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const format = useFormatter()
  const spendingConfig: ChartConfig = useMemo(
    () => ({
      amount: {
        color: "hsl(var(--foreground))",
        label: t("spending.title"),
      },
    }),
    [t],
  )

  const categoryConfig: ChartConfig = useMemo(
    () => ({
      amount: {
        color: "hsl(var(--foreground))",
        label: t("categoryBreakdown.title"),
      },
    }),
    [t],
  )

  const tickConfig = useMemo(
    () => ({
      fill: "hsl(var(--muted-foreground) / 0.5)",
      fontSize: 11,
    }),
    [],
  )

  const categoryTickConfig = useMemo(
    () => ({
      fill: "hsl(var(--muted-foreground))",
      fontSize: 12,
    }),
    [],
  )

  const chartMargin = useMemo(
    () => ({
      bottom: 0,
      left: -20,
      right: 4,
      top: 4,
    }),
    [],
  )

  const barChartMargin = useMemo(
    () => ({
      bottom: 0,
      left: 0,
      right: 4,
      top: 0,
    }),
    [],
  )

  const tickFormatter = useCallback(
    (value: number) => {
      const formatted = format.number(value / MINOR_UNITS_PER_MAJOR / THOUSAND_DIVISOR, {
        currency: DEFAULT_ADMIN_CUSTOMER_CURRENCY,
        maximumFractionDigits: TICK_DECIMALS,
        minimumFractionDigits: TICK_DECIMALS,
        style: "currency",
      })

      return `${formatted}${THOUSAND_SUFFIX}`
    },
    [format],
  )

  const RADIUS_RIGHT = 4
  const RADIUS_OTHER = 0
  const barRadius = useMemo<[number, number, number, number]>(() => [RADIUS_OTHER, RADIUS_RIGHT, RADIUS_RIGHT, RADIUS_OTHER], [])
  const tooltipContent = useMemo(() => <ChartTooltipContent />, [])
  const hasSpendingData = customer.monthlySpending.some((entry) => entry.amount > 0)
  const hasCategoryData = customer.categoryBreakdown.length > 0

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
          {hasSpendingData ? (
            <ChartContainer config={spendingConfig} className="h-[220px] w-full">
              <SpendingChart
                data={customer.monthlySpending}
                margin={chartMargin}
                tickConfig={tickConfig}
                tickFormatter={tickFormatter}
                tooltipContent={tooltipContent}
              />
            </ChartContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{t("spending.empty")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-medium">{t("categoryBreakdown.title")}</p>
          {hasCategoryData ? (
            <ChartContainer config={categoryConfig} className="h-[220px] w-full">
              <CategoryBreakdownChart
                data={customer.categoryBreakdown}
                margin={barChartMargin}
                tickConfig={categoryTickConfig}
                barRadius={barRadius}
                tooltipContent={tooltipContent}
              />
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
  margin,
  tickConfig,
  tickFormatter,
  tooltipContent,
}: Readonly<{
  data: User["adminCustomerDetail"]["monthlySpending"]
  margin: object
  tickConfig: object
  tickFormatter: (value: number) => string
  tooltipContent: JSX.Element
}>): JSX.Element => (
  <AreaChart data={data} margin={margin}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tickConfig} />
    <YAxis tickLine={false} axisLine={false} tick={tickConfig} tickFormatter={tickFormatter} />
    <ChartTooltip content={tooltipContent} />
    <ChartGradients />
    <Area type="monotone" dataKey="amount" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#spending-fill)" dot={false} />
  </AreaChart>
)

const CategoryBreakdownChart = ({
  data,
  margin,
  tickConfig,
  barRadius,
  tooltipContent,
}: Readonly<{
  data: User["adminCustomerDetail"]["categoryBreakdown"]
  margin: object
  tickConfig: object
  barRadius: [number, number, number, number]
  tooltipContent: JSX.Element
}>): JSX.Element => (
  <BarChart data={data} layout="vertical" margin={margin}>
    <XAxis type="number" hide />
    <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} tick={tickConfig} width={80} />
    <ChartTooltip content={tooltipContent} />
    <Bar dataKey="amount" fill="hsl(var(--foreground))" radius={barRadius} barSize={20} />
  </BarChart>
)

const ChartGradients = (): JSX.Element => (
  <defs>
    <linearGradient id="spending-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
      <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
    </linearGradient>
  </defs>
)

const MINOR_UNITS_PER_MAJOR = 100

const THOUSAND_DIVISOR = 1000

const TICK_DECIMALS = 0

const THOUSAND_SUFFIX = "k"

interface CustomerChartsProps {
  readonly customer: User["adminCustomerDetail"]
}

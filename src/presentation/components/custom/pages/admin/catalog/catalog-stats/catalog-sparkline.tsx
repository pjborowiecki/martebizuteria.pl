import { type JSX, useMemo } from "react"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

import { type SparkPoint } from "~/src/data/catalog-data"
export const CatalogSparkline = ({ sparkData, statKey, color }: CatalogSparklineProps): JSX.Element => {
  const chartData = useMemo(() => [...sparkData], [sparkData])
  return (
    <div className="h-12 w-24 min-w-0 shrink-0">
      <ResponsiveContainer width={96} height={48}>
        <AreaChart data={chartData}>
          <StatGradient id={`grad-${statKey}`} color={color} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#grad-${statKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
const StatGradient = ({ color, id }: { readonly color: string; readonly id: string }): JSX.Element => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  </defs>
)

interface CatalogSparklineProps {
  readonly sparkData: readonly SparkPoint[]
  readonly statKey: string
  readonly color: string
}

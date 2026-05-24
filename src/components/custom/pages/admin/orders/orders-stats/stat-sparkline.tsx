import { type JSX, useMemo } from "react";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { type OrderStatSparkPoint, SPARKLINE_HEIGHT, SPARKLINE_STROKE_WIDTH, SPARKLINE_WIDTH } from "~/src/data/orders-data";

interface StatSparklineProps {
  readonly color: string;
  readonly gradientId: string;
  readonly spark: readonly OrderStatSparkPoint[];
}

export function StatSparkline({ color, gradientId, spark }: StatSparklineProps): JSX.Element {
  const data = useMemo(() => [...spark], [spark]);

  return (
    <ResponsiveContainer height={SPARKLINE_HEIGHT} width={SPARKLINE_WIDTH}>
      <AreaChart data={data}>
        <StatGradient color={color} id={gradientId} />
        <Area dataKey="v" dot={false} fill={`url(#${gradientId})`} stroke={color} strokeWidth={SPARKLINE_STROKE_WIDTH} type="monotone" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatGradient({ color, id }: { readonly color: string; readonly id: string }): JSX.Element {
  return (
    <defs>
      <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.2} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

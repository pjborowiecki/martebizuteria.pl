import { type JSX } from "react";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { COUPON_STATS } from "~/src/data/coupons-data";

export function CouponStats(): JSX.Element {
  return (
    <div className="mb-5 grid shrink-0 gap-5 sm:grid-cols-4">
      {COUPON_STATS.map((stat) => (
        <CouponStatCard key={stat.key} stat={stat} />
      ))}
    </div>
  );
}

function CouponStatCard({ stat }: { stat: (typeof COUPON_STATS)[number] }): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{t(`coupons.stats.${stat.key}.label`)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`coupons.stats.${stat.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <StatTrend trend={stat.trend} up={stat.up} />
              <span className="text-[11px] text-muted-foreground/50">{t("customers.stats.vsPrevious")}</span>
            </div>
          </div>
          <CouponStatSparkline stat={stat} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatGradient({ color, id }: { readonly color: string; readonly id: string }): JSX.Element {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.2} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

function CouponStatSparkline({ stat }: { readonly stat: (typeof COUPON_STATS)[number] }): JSX.Element {
  return (
    <div className="h-12 w-24 min-w-0 shrink-0">
      <ResponsiveContainer width={96} height={48}>
        <AreaChart data={stat.spark}>
          <StatGradient id={`cpn-grad-${stat.key}`} color={stat.color} />
          <Area type="monotone" dataKey="v" stroke={stat.color} strokeWidth={1.5} fill={`url(#cpn-grad-${stat.key})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatTrend({ trend, up }: { readonly trend: string; readonly up: boolean }): JSX.Element {
  if (up) {
    return (
      <span className="flex items-center gap-0.5 text-[12px] text-emerald-600">
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
        {trend}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[12px] text-red-500">
      <ArrowDownRight className="size-3.5" strokeWidth={2} />
      {trend}
    </span>
  );
}

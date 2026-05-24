"";

import { type JSX, useMemo } from "react";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

interface SparkData {
  readonly v: number;
}

interface StatItem {
  readonly color: string;
  readonly key: string;
  readonly spark: readonly SparkData[];
  readonly trend: string;
  readonly up: boolean;
}

export function CategoriesStats({ stats }: Readonly<{ stats: readonly StatItem[] }>): JSX.Element {
  return (
    <div className="grid gap-5 sm:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.key} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }: Readonly<{ stat: StatItem }>): JSX.Element {
  const t = useTranslations("admin");

  const trendIcon = useMemo(() => {
    if (stat.up) {
      return (
        <span className="flex items-center gap-0.5 text-[12px] text-emerald-600">
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
          {stat.trend}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-0.5 text-[12px] text-red-500">
        <ArrowDownRight className="size-3.5" strokeWidth={2} />
        {stat.trend}
      </span>
    );
  }, [stat.up, stat.trend]);

  return (
    <Card className="overflow-hidden border-border/40 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{t(`categories.stats.${stat.key}.label`)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`categories.stats.${stat.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              {trendIcon}
              <span className="text-[11px] text-muted-foreground/50">{t("categories.stats.vsPrevious")}</span>
            </div>
          </div>
          <StatSparkline stat={stat} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatSparkline({ stat }: Readonly<{ stat: StatItem }>): JSX.Element {
  return (
    <div className="h-12 w-24 min-w-0 shrink-0">
      <ResponsiveContainer width={96} height={48}>
        <AreaChart data={stat.spark}>
          <StatGradient color={stat.color} id={`cat-grad-${stat.key}`} />
          <Area type="monotone" dataKey="v" stroke={stat.color} strokeWidth={1.5} fill={`url(#cat-grad-${stat.key})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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

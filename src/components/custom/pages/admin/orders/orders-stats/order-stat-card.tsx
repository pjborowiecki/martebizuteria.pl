import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { StatSparkline } from "~/src/components/custom/pages/admin/orders/orders-stats/stat-sparkline";
import { StatTrend } from "~/src/components/custom/pages/admin/orders/orders-stats/stat-trend";

import type { OrderStat } from "~/src/data/orders-data";

interface OrderStatCardProps {
  readonly stat: OrderStat;
}

export function OrderStatCard({ stat }: OrderStatCardProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="overflow-hidden border-border/40 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent shadow-none">
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{t(`orders.stats.${stat.key}.label`)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`orders.stats.${stat.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <StatTrend trend={stat.trend} up={stat.up} />
              <span className="text-[11px] text-muted-foreground/50">{t("orders.stats.vsPrevious")}</span>
            </div>
          </div>
          <div className="h-12 w-24 shrink-0">
            <StatSparkline color={stat.color} gradientId={`ord-grad-${stat.key}`} spark={stat.spark} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

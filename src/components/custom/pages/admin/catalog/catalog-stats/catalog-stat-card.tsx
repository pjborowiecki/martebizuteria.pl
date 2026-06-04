import type { JSX } from "react";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { CatalogSparkline } from "~/src/components/custom/pages/admin/catalog/catalog-stats/catalog-sparkline";

import type { ProductStatRecord } from "~/src/data/catalog-data";

interface CatalogStatCardProps {
  readonly stat: ProductStatRecord;
}

export function CatalogStatCard({ stat }: CatalogStatCardProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog");

  return (
    <Card className="overflow-hidden border-border/40 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent shadow-none">
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{t(`stats.${stat.key}.label`)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`stats.${stat.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <StatTrend up={stat.up} trend={stat.trend} />
              <span className="text-[11px] text-muted-foreground/50">{t("stats.vsPrevious")}</span>
            </div>
          </div>
          <CatalogSparkline sparkData={stat.spark} statKey={stat.key} color={stat.color} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatTrend({ up, trend }: { readonly up: boolean; readonly trend: string }): JSX.Element {
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

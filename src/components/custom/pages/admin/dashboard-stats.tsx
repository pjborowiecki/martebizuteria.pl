import type { JSX } from "react";

import { ArrowDownRight, ArrowUpRight, DollarSign, Eye, ShoppingCart, Users } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";

const STAT_CARDS = [
  { gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent", icon: DollarSign, key: "revenue", trend: "+12.5%", up: true },
  { gradient: "from-blue-500/20 via-blue-500/5 to-transparent", icon: ShoppingCart, key: "orders", trend: "+8.2%", up: true },
  { gradient: "from-purple-500/20 via-purple-500/5 to-transparent", icon: Users, key: "customers", trend: "+4.1%", up: true },
  { gradient: "from-amber-500/20 via-amber-500/5 to-transparent", icon: Eye, key: "views", trend: "-2.4%", up: false }
] as const;

export function DashboardStats(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card) => (
        <Card key={card.key} className={cn("border-border/40 bg-gradient-to-br shadow-none", card.gradient)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{t(`dashboard.stats.${card.key}.label`)}</span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                <card.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{t(`dashboard.stats.${card.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              {card.up ? (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                  <ArrowUpRight className="size-3" strokeWidth={2} />
                  {card.trend}
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
                  <ArrowDownRight className="size-3" strokeWidth={2} />
                  {card.trend}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{t("dashboard.stats.vsPrevious")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

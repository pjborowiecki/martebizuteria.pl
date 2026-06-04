import { type JSX } from "react";

import { ArrowUpRight, CreditCard, ShoppingBag, TrendingUp } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { CUSTOMER } from "~/src/data/customer-detail-data";

export function CustomerKpis(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  const kpis = [
    { color: "text-foreground", icon: CreditCard, label: t("kpi.totalSpent"), value: CUSTOMER.spent },
    { color: "text-foreground", icon: ShoppingBag, label: t("kpi.orders"), value: String(CUSTOMER.orders) },
    { color: "text-foreground", icon: TrendingUp, label: t("kpi.avgOrder"), value: CUSTOMER.avgOrder },
    { color: "text-emerald-600", icon: ArrowUpRight, label: t("kpi.returnRate"), value: CUSTOMER.returningRate }
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-secondary">
                <kpi.icon className={`size-4 ${kpi.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

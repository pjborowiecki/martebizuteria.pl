import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Card, CardContent } from "~/src/components/shadcn/card";

import { DEMO_ORDER, DEMO_SUMMARY, ORDER_PAYMENT_STYLES, ORDER_STATUS_STYLES } from "~/src/data/order-detail-data";

export function OrderMetaStrip(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div>
          <p className="text-[11px] tracking-wider text-muted-foreground/50 uppercase">{t("orderDetail.meta.date")}</p>
          <p className="mt-0.5 text-sm">
            {DEMO_ORDER.date}
            {", "}
            {DEMO_ORDER.time}
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-wider text-muted-foreground/50 uppercase">{t("orderDetail.meta.status")}</p>
          <Badge className={`mt-1 border-0 text-[11px] ${ORDER_STATUS_STYLES[DEMO_ORDER.status] ?? ""}`} variant="secondary">
            {t(`orderDetail.status.${DEMO_ORDER.status}`)}
          </Badge>
        </div>
        <div>
          <p className="text-[11px] tracking-wider text-muted-foreground/50 uppercase">{t("orderDetail.meta.payment")}</p>
          <Badge className={`mt-1 border-0 text-[11px] ${ORDER_PAYMENT_STYLES[DEMO_ORDER.payment] ?? ""}`} variant="secondary">
            {t(`orderDetail.payment.${DEMO_ORDER.payment}`)}
          </Badge>
        </div>
        <div>
          <p className="text-[11px] tracking-wider text-muted-foreground/50 uppercase">{t("orderDetail.meta.channel")}</p>
          <p className="mt-0.5 text-sm">{DEMO_ORDER.channel}</p>
        </div>
        <div className="ml-auto">
          <p className="text-right text-[11px] tracking-wider text-muted-foreground/50 uppercase">{t("orderDetail.meta.total")}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{DEMO_SUMMARY.total}</p>
        </div>
      </CardContent>
    </Card>
  );
}

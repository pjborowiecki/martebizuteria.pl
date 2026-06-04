import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { FulfillmentStepItem } from "~/src/components/custom/pages/admin/orders/detail/fulfillment-step-item";

import { DEMO_FULFILLMENT_STEPS } from "~/src/data/order-detail-data";

export function OrderFulfillmentTracker(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-5 text-sm font-medium">{t("orderDetail.fulfillment.title")}</p>
        <div className="flex items-start justify-between">
          {DEMO_FULFILLMENT_STEPS.map((step, i) => (
            <FulfillmentStepItem index={i} key={step.key} step={step} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

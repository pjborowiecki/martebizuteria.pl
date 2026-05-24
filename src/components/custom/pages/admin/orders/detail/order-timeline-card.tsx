import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { OrderTimelineEvent } from "~/src/components/custom/pages/admin/orders/detail/order-timeline-event";

import { DEMO_TIMELINE, TIMELINE_KEY_SLICE_LENGTH, TIMELINE_KEY_SLICE_START } from "~/src/data/order-detail-data";

export function OrderTimelineCard(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("orderDetail.timeline.title")}</p>
        <div className="space-y-0">
          {DEMO_TIMELINE.map((event) => (
            <OrderTimelineEvent
              event={event}
              key={`${event.date}-${event.type}-${event.description.slice(TIMELINE_KEY_SLICE_START, TIMELINE_KEY_SLICE_LENGTH)}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";

import { DEMO_ORDER } from "~/src/data/order-detail-data";

export function OrderNotesCard(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("orderDetail.notes.title")}</p>
          <Button className="h-7 text-xs text-muted-foreground" size="sm" variant="ghost">
            {t("orderDetail.notes.edit")}
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{DEMO_ORDER.notes}</p>
      </CardContent>
    </Card>
  );
}

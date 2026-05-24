import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Card, CardContent } from "~/src/components/shadcn/card";

import { DEMO_ORDER } from "~/src/data/order-detail-data";

export function OrderTagsCard(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("orderDetail.tags.title")}</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ORDER.tags.map((tag) => (
            <Badge className="text-[11px]" key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

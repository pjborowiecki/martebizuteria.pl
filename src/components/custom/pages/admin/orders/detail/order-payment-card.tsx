import type { JSX } from "react";

import { Copy, CreditCard } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";

import { DEMO_ORDER } from "~/src/data/order-detail-data";

export function OrderPaymentCard(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("orderDetail.paymentDetails.title")}</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <CreditCard className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-muted-foreground">{DEMO_ORDER.paymentMethod}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/40">
              <span className="font-mono text-[10px]">#</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{DEMO_ORDER.transactionId}</span>
            <Button className="ml-auto size-6 text-muted-foreground/40" size="icon" variant="ghost">
              <Copy className="size-3" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

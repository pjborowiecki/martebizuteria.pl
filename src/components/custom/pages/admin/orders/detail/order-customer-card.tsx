import type { JSX } from "react";

import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { useTranslations } from "use-intl";

import { Avatar, AvatarFallback } from "~/src/components/shadcn/avatar";
import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Separator } from "~/src/components/shadcn/separator";

import { DEMO_CUSTOMER } from "~/src/data/order-detail-data";

export function OrderCustomerCard(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("orderDetail.customer.title")}</p>
        <div className="flex items-center gap-3">
          <Avatar className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-foreground text-xs font-medium text-background">
              {DEMO_CUSTOMER.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium transition-colors hover:text-foreground/70">{DEMO_CUSTOMER.name}</p>
            <p className="text-[12px] text-muted-foreground">
              <span className="font-mono">{DEMO_CUSTOMER.number}</span>
              <span className="mx-1 text-muted-foreground/30">·</span>
              {t("orderDetail.customer.ordersCount", { count: DEMO_CUSTOMER.orders })}
            </p>
          </div>
          <Badge className="ml-auto bg-foreground text-[11px] text-background hover:bg-foreground" variant="default">
            {DEMO_CUSTOMER.tier}
          </Badge>
        </div>
        <Separator className="my-4 bg-border/40" />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="truncate text-muted-foreground">{DEMO_CUSTOMER.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-muted-foreground">{DEMO_CUSTOMER.phone}</span>
          </div>
        </div>
        <Button className="mt-3 h-8 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground" size="sm" variant="ghost">
          {t("orderDetail.customer.viewProfile")}
          <ArrowUpRight className="size-3" strokeWidth={2} />
        </Button>
      </CardContent>
    </Card>
  );
}

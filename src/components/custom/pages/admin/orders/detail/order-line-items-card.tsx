import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Separator } from "~/src/components/shadcn/separator";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { OrderLineItemRow } from "~/src/components/custom/pages/admin/orders/detail/order-line-item-row";

import { DEMO_LINE_ITEMS, DEMO_SUMMARY } from "~/src/data/order-detail-data";

const HEADER_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground/60";

export function OrderLineItemsCard(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-medium">
            {t("orderDetail.items.title")}
            <span className="ml-2 text-muted-foreground/50">({DEMO_LINE_ITEMS.length})</span>
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`pl-5 ${HEADER_CLASS}`}>{t("orderDetail.items.columns.product")}</TableHead>
              <TableHead className={HEADER_CLASS}>{t("orderDetail.items.columns.sku")}</TableHead>
              <TableHead className={`text-center ${HEADER_CLASS}`}>{t("orderDetail.items.columns.qty")}</TableHead>
              <TableHead className={`text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.price")}</TableHead>
              <TableHead className={`pr-5 text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_LINE_ITEMS.map((item) => (
              <OrderLineItemRow item={item} key={item.sku} />
            ))}
          </TableBody>
        </Table>

        <Separator className="bg-border/40" />

        <div className="ml-auto max-w-xs space-y-2 px-5 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("orderDetail.summary.subtotal")}</span>
            <span className="font-mono">{DEMO_SUMMARY.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("orderDetail.summary.shipping")}
              <span className="ml-1 text-[11px] text-muted-foreground/40">({DEMO_SUMMARY.shippingLabel})</span>
            </span>
            <span className="font-mono">{DEMO_SUMMARY.shipping}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("orderDetail.summary.tax")}
              <span className="ml-1 text-[11px] text-muted-foreground/40">({DEMO_SUMMARY.taxLabel})</span>
            </span>
            <span className="font-mono">{DEMO_SUMMARY.tax}</span>
          </div>
          <Separator className="bg-border/40" />
          <div className="flex justify-between pt-1">
            <span className="text-sm font-medium">{t("orderDetail.summary.total")}</span>
            <span className="font-mono text-base font-semibold">{DEMO_SUMMARY.total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

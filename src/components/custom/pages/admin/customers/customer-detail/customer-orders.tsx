import { type JSX } from "react";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { ORDERS, PAYMENT_STYLES, STATUS_STYLES } from "~/src/data/customer-detail-data";

export function CustomerOrders(): JSX.Element {
  const t = useTranslations("admin.customerDetail");

  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-medium">{t("orders.title")}</p>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {t("orders.viewAll")}
            <ArrowUpRight className="size-3" strokeWidth={2} />
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.order")}
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.date")}
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.items")}
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.total")}
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.status")}
              </TableHead>
              <TableHead className="pr-5 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                {t("orders.columns.payment")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ORDERS.map((order) => (
              <CustomerOrderRow key={order.id} order={order} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustomerOrderRow({ order }: { order: (typeof ORDERS)[number] }): JSX.Element {
  const t = useTranslations("admin.customerDetail");

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-5 font-mono text-sm font-medium">{order.id}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
      <TableCell className="max-w-[240px] truncate text-sm">{order.items.join(", ")}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{order.total}</TableCell>
      <TableCell>
        <Badge variant="secondary" className={`border-0 text-[11px] ${STATUS_STYLES[order.status] ?? ""}`}>
          {t(`orders.status.${order.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-5">
        <Badge variant="secondary" className={`border-0 text-[11px] ${PAYMENT_STYLES[order.payment] ?? ""}`}>
          {t(`orders.payment.${order.payment}`)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

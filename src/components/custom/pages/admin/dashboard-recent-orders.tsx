import type { JSX } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Avatar, AvatarFallback } from "~/src/components/shadcn/avatar";
import { Badge } from "~/src/components/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { LocalizedLink } from "~/src/components/custom/localized-link";

const RECENT_ORDERS = [
  {
    customer: "Eleanor H. Sterling",
    date: "Oct 24, 2023",
    fulfillment: "unfulfilled",
    id: "MR-9241",
    initials: "EH",
    payment: "paid",
    total: "$4,250.00"
  },
  {
    customer: "Adrian Wentworth",
    date: "Oct 23, 2023",
    fulfillment: "shipped",
    id: "MR-9238",
    initials: "AW",
    payment: "paid",
    total: "$12,800.00"
  },
  {
    customer: "Lydia Chen",
    date: "Oct 21, 2023",
    fulfillment: "pending",
    id: "MR-9235",
    initials: "LC",
    payment: "authorized",
    total: "$1,150.00"
  },
  {
    customer: "Julian Morel",
    date: "Oct 19, 2023",
    fulfillment: "delivered",
    id: "MR-9230",
    initials: "JM",
    payment: "paid",
    total: "$7,400.00"
  },
  {
    customer: "Sofia Nakamura",
    date: "Oct 18, 2023",
    fulfillment: "shipped",
    id: "MR-9228",
    initials: "SN",
    payment: "paid",
    total: "$3,600.00"
  }
] as const;

const FULFILLMENT_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500",
  pending: "bg-amber-500",
  shipped: "bg-blue-500",
  unfulfilled: "bg-muted-foreground/30"
};

export function DashboardRecentOrders(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent shadow-none xl:col-span-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("dashboard.recentOrders.title")}</CardTitle>
          <LocalizedLink
            to={CONSTANTS.ROUTES.ADMIN_ORDERS}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("dashboard.recentOrders.viewAll")}
            <ArrowRight className="size-3.5" strokeWidth={1.5} />
          </LocalizedLink>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 text-xs font-medium">{t("dashboard.recentOrders.columns.order")}</TableHead>
              <TableHead className="text-xs font-medium">{t("dashboard.recentOrders.columns.customer")}</TableHead>
              <TableHead className="text-xs font-medium">{t("dashboard.recentOrders.columns.date")}</TableHead>
              <TableHead className="text-right text-xs font-medium">{t("dashboard.recentOrders.columns.total")}</TableHead>
              <TableHead className="text-xs font-medium">{t("dashboard.recentOrders.columns.payment")}</TableHead>
              <TableHead className="pr-6 text-xs font-medium">{t("dashboard.recentOrders.columns.fulfillment")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RECENT_ORDERS.map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecentOrderRow({ order }: { readonly order: (typeof RECENT_ORDERS)[number] }): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="pl-6 font-mono text-sm font-medium">{`#${order.id}`}</TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="sm" className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-secondary text-[10px] font-medium">{order.initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{order.customer}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{order.total}</TableCell>
      <TableCell>
        <Badge
          variant={order.payment === "paid" ? "default" : "outline"}
          className={order.payment === "paid" ? "bg-emerald-600 text-[11px]" : "text-[11px]"}
        >
          {t(`dashboard.recentOrders.status.${order.payment}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-6">
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${FULFILLMENT_COLORS[order.fulfillment] ?? "bg-muted-foreground/30"}`} />
          <span className="text-sm text-muted-foreground capitalize">{t(`dashboard.recentOrders.status.${order.fulfillment}`)}</span>
        </span>
      </TableCell>
    </TableRow>
  );
}

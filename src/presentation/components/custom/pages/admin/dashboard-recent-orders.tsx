import { type JSX } from "react"

import { ArrowRight } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type AdminOrderFulfillmentUiKey } from "~/src/modules/order/order.constants"
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"

import { ROUTES } from "~/src/routes"

export const DashboardRecentOrders = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { data: snapshot } = useAdminDashboardSnapshot()

  return (
    <Card className="border-border/40 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent shadow-none xl:col-span-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("dashboard.recentOrders.title")}</CardTitle>
          <LocalizedLink
            to={ROUTES.ADMIN_ORDERS}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("dashboard.recentOrders.viewAll")}
            <ArrowRight className="size-3.5" strokeWidth={1.5} />
          </LocalizedLink>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        {snapshot.recentOrders.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{t("dashboard.recentOrders.empty")}</p>
        ) : (
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
              {snapshot.recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const RecentOrderRow = ({ order }: { readonly order: Order["adminListItem"] }): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="pl-6 font-mono text-sm font-medium">{`#${order.id}`}</TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="sm" className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-secondary text-[10px] font-medium">{order.initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{order.customerName}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatAdminOrderDate(order.createdAt, locale)}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">
        {formatPrice(order.totalMinorUnits, order.currencyCode, locale)}
      </TableCell>
      <TableCell>
        <Badge
          variant={order.paymentUiKey === "paid" ? "default" : "outline"}
          className={order.paymentUiKey === "paid" ? "bg-emerald-600 text-[11px]" : "text-[11px]"}
        >
          {t(`dashboard.recentOrders.status.${order.paymentUiKey}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-6">
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${FULFILLMENT_COLORS[order.fulfillmentUiKey]}`} />
          <span className="text-sm text-muted-foreground capitalize">{t(`dashboard.recentOrders.status.${order.fulfillmentUiKey}`)}</span>
        </span>
      </TableCell>
    </TableRow>
  )
}

const FULFILLMENT_COLORS: Record<AdminOrderFulfillmentUiKey, string> = {
  delivered: "bg-emerald-500",
  pending: "bg-amber-500",
  returned: "bg-red-500",
  shipped: "bg-blue-500",
  unfulfilled: "bg-muted-foreground/30",
}

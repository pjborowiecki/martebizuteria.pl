import { type JSX, type MouseEvent, useCallback } from "react"

import { useNavigate } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"
import { OrderFulfillmentCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-fulfillment-cell"
import { OrderPaymentBadge } from "~/src/presentation/components/custom/pages/admin/orders/components/order-payment-badge"
import { OrdersRowActions } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions"

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
                <TableHead className="text-xs font-medium">{t("dashboard.recentOrders.columns.fulfillment")}</TableHead>
                <TableHead className="pr-6">
                  <span className="sr-only">{t("orders.columns.actions")}</span>
                </TableHead>
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

const isOrderCellClick = ({ currentTarget, target }: MouseEvent<HTMLTableRowElement>): boolean =>
  target instanceof Element && currentTarget.contains(target) && target.closest("a, [data-prevent-row-click]") === null

const RecentOrderRow = ({ order }: { readonly order: Order["adminListItem"] }): JSX.Element => {
  const locale = useLocale()
  const navigate = useNavigate()
  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => {
      if (consumeDataGridRowClickSuppression() || !isOrderCellClick(event)) {
        return
      }

      void navigate({ params: { orderId: order.id }, to: ROUTES.ADMIN_ORDER })
    },
    [navigate, order.id],
  )

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={handleRowClick}>
      <TableCell className="pl-6 font-mono text-sm font-medium whitespace-nowrap">
        <LocalizedLink params={{ orderId: order.id }} to={ROUTES.ADMIN_ORDER} className="hover:underline">
          {order.orderNumber}
        </LocalizedLink>
      </TableCell>
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
        <OrderPaymentBadge paymentUiKey={order.paymentUiKey} />
      </TableCell>
      <TableCell>
        <OrderFulfillmentCell fulfillmentUiKey={order.fulfillmentUiKey} />
      </TableCell>
      <TableCell className="pr-6 text-right" data-prevent-row-click>
        <OrdersRowActions order={order} />
      </TableCell>
    </TableRow>
  )
}

import { type JSX, useCallback, useMemo } from "react"

import { Link, useRouter } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { useTranslations } from "use-intl"

import { type User } from "~/src/modules/user/user.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES,
  CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail.constants"

import { ROUTES } from "~/src/routes"
export const CustomerOrders = ({ customer }: CustomerOrdersProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const ordersLink = useMemo(() => <Link to={`/{-$locale}${ROUTES.ADMIN_ORDERS}`} />, [])
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-medium">{t("orders.title")}</p>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground" render={ordersLink}>
            {t("orders.viewAll")}
            <ArrowUpRight className="size-3" strokeWidth={2} />
          </Button>
        </div>
        {customer.orders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">{t("orders.empty")}</p>
        ) : (
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
              {customer.orders.map((order) => (
                <CustomerOrderRow key={order.id} order={order} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
const CustomerOrderRow = ({ order }: { order: User["adminCustomerDetail"]["orders"][number] }): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const router = useRouter()
  const itemsLabel = order.itemTitles.length === 0 ? "—" : order.itemTitles.join(", ")
  const handleOrderClick = useCallback(() => {
    void router.navigate({
      to: `/{-$locale}/admin/orders/${order.id}`,
    })
  }, [order.id, router])
  return (
    <TableRow className="group cursor-pointer" onClick={handleOrderClick}>
      <TableCell className="pl-5 font-mono text-sm font-medium">{order.id}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
      <TableCell className="max-w-[240px] truncate text-sm">{itemsLabel}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{order.total}</TableCell>
      <TableCell>
        <Badge variant="secondary" className={`border-0 text-[11px] ${CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES[order.fulfillment] ?? ""}`}>
          {t(`orders.status.${order.fulfillment}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-5">
        <Badge variant="secondary" className={`border-0 text-[11px] ${CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES[order.payment] ?? ""}`}>
          {t(`orders.payment.${order.payment}`)}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
interface CustomerOrdersProps {
  readonly customer: User["adminCustomerDetail"]
}

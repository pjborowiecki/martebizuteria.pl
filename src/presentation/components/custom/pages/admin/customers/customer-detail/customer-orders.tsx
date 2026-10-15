import { type JSX } from "react"

import { cn } from "cn"
import { ArrowUpRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import {
  CUSTOMER_ORDERS_VIEW,
  customerOrdersDataGrid,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/utils/customer-orders-data-grid"
import { useOpenOrder } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-open-order"
import { useOrdersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"

import { ROUTES } from "~/src/routes"

export const CustomerOrders = ({ customerId }: Readonly<CustomerOrdersProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const openOrder = useOpenOrder()
  const grid = useOrdersDataGrid({
    onRowClick: openOrder,
    userId: customerId,
    view: CUSTOMER_ORDERS_VIEW,
  })

  return (
    <section className="flex flex-col 2xl:[@media(min-height:57rem)]:min-h-60 2xl:[@media(min-height:57rem)]:flex-1">
      <Provider value={grid}>
        <div className={cn(ADMIN_CATALOG_DATAGRID_PAGE_CLASS, "gap-3")}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t("orders.title")}</h2>
            <LocalizedLink
              to={ROUTES.ADMIN_ORDERS}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t("orders.viewAll")}
              <ArrowUpRight className="size-3" strokeWidth={2} />
            </LocalizedLink>
          </div>
          <DataGridShell>
            <Toolbar />
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>
    </section>
  )
}

const { Body, Pagination, Provider, Toolbar } = customerOrdersDataGrid

interface CustomerOrdersProps {
  readonly customerId: string
}

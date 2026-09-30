import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { getAdminOrderStatsQuery } from "~/src/modules/order/use-cases/get-admin-order-stats"
import { getAdminOrdersPageQuery } from "~/src/modules/order/use-cases/get-admin-orders-page"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { OrdersTableContent } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-table"

const prefetchOrdersQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAdminOrdersPageQuery({
        page: 1,
        pageSize: ADMIN_ORDERS_PAGE_SIZE,
      }),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...getAdminOrderStatsQuery(),
      staleTime: "static",
    }),
  ])
}

const AdminOrdersRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")

  return (
    <>
      <AdminHeader description={t("description")} title={t("title")} />
      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <OrdersTableContent />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/orders/")({
  component: AdminOrdersRoute,
  loader: ({ context }) => prefetchOrdersQueries(context),
  shouldReload: false,
  staleTime: ORDER_QUERY_STALE_MS,
  staticData: {
    namespaces: ["pages.admin.customers"],
  },
})

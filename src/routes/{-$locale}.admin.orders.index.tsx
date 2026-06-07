import type { JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { OrdersTableContent } from "~/src/components/custom/pages/admin/orders/components/orders-table";

import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants";
import { orderQueryOptions } from "~/src/modules/order/order.queries";

async function prefetchOrdersQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(
      orderQueryOptions.adminOrdersPageQueryOptions({
        page: 1,
        pageSize: ADMIN_ORDERS_PAGE_SIZE
      })
    ),
    context.queryClient.ensureQueryData(orderQueryOptions.adminOrderStatsQueryOptions())
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/orders/")({
  component: AdminOrdersRoute,
  loader: ({ context }) => prefetchOrdersQueries(context),
  shouldReload: false,
  staleTime: ORDER_QUERY_STALE_MS
});

function AdminOrdersRoute(): JSX.Element {
  const t = useTranslations("pages.admin.orders");

  return (
    <>
      <AdminHeader description={t("description")} title={t("title")} />
      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <OrdersTableContent />
      </div>
    </>
  );
}

import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { getAdminOrderQuery } from "~/src/modules/order/use-cases/get-admin-order"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { OrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-actions"
import { OrderDetailPage } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-page"

import { ROUTES } from "~/src/routes"

const AdminOrderDetailRoute = (): JSX.Element => {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(getAdminOrderQuery(orderId))
  const t = useTranslations("pages.admin")
  const breadcrumbs = useMemo(
    () => [
      {
        href: ROUTES.ADMIN,
        label: t("nav.dashboard"),
      },
      {
        href: ROUTES.ADMIN_ORDERS,
        label: t("nav.orders"),
      },
    ],
    [t],
  )

  return (
    <>
      <AdminHeader
        actions={<OrderDetailActions order={order} />}
        backHref={ROUTES.ADMIN_ORDERS}
        breadcrumbs={breadcrumbs}
        title={order.displayId}
      />
      <OrderDetailPage order={order} />
    </>
  )
}

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: AdminOrderDetailRoute,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...getAdminOrderQuery(params.orderId),
      staleTime: "static",
    })
  },
})

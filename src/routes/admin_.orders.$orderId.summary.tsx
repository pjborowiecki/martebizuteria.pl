import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { requireAdmin } from "~/src/integrations/better-auth/auth.routes"

import { getAdminOrderQuery } from "~/src/modules/order/use-cases/get-admin-order"
import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { OrderSummaryPage } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-page"

const AdminOrderSummaryRoute = (): JSX.Element => {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(getAdminOrderQuery(orderId))

  return <OrderSummaryPage order={order} />
}

export const Route = createFileRoute("/admin_/orders/$orderId/summary")({
  beforeLoad: requireAdmin,
  component: AdminOrderSummaryRoute,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...getAdminOrderQuery(params.orderId),
        staleTime: "static",
      }),
      context.queryClient.query(getAdminSellerDetailsQuery()),
    ])
  },
  staticData: {
    namespaces: ["pages.admin"],
  },
})

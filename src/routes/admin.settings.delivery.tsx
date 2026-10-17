import { createFileRoute } from "@tanstack/react-router"

import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { getAdminFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"

import { SettingsDeliveryPage } from "~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-page"

export const Route = createFileRoute("/admin/settings/delivery")({
  component: SettingsDeliveryPage,
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.query(listAdminDeliveryMethodsQuery()), context.queryClient.query(getAdminFreeDeliveryQuery())])
  },
})

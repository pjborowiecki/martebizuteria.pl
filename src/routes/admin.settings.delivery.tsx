import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { getAdminFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"

import { SettingsDeliveryMethodsCard } from "~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-methods-card"
import { SettingsFreeDeliveryCard } from "~/src/presentation/components/custom/pages/admin/settings/delivery/settings-free-delivery-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

const AdminSettingsDeliveryRoute = (): JSX.Element => (
  <SettingsPageLayout active="delivery">
    <SettingsDeliveryMethodsCard />
    <SettingsFreeDeliveryCard />
  </SettingsPageLayout>
)

export const Route = createFileRoute("/admin/settings/delivery")({
  component: AdminSettingsDeliveryRoute,
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.query(listAdminDeliveryMethodsQuery()), context.queryClient.query(getAdminFreeDeliveryQuery())])
  },
})

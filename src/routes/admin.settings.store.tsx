import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"
import { SettingsSellerDetailsCard } from "~/src/presentation/components/custom/pages/admin/settings/store/settings-seller-details-card"

const AdminSettingsStoreRoute = (): JSX.Element => (
  <SettingsPageLayout active="store">
    <SettingsSellerDetailsCard />
  </SettingsPageLayout>
)

export const Route = createFileRoute("/admin/settings/store")({
  component: AdminSettingsStoreRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(getAdminSellerDetailsQuery())
  },
})

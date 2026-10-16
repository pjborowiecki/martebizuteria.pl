import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

import { SettingsPreferencesCard } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-preferences-card"
import { SettingsProfileCard } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-profile-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

const AdminSettingsAccountRoute = (): JSX.Element => (
  <SettingsPageLayout active="account">
    <SettingsProfileCard />
    <SettingsPreferencesCard />
  </SettingsPageLayout>
)

export const Route = createFileRoute("/admin/settings/account")({
  component: AdminSettingsAccountRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(getCustomerProfileQuery())
  },
})

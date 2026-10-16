import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"
import { listCustomerLoginHistoryQuery } from "~/src/modules/customer-account/use-cases/list-customer-login-history"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"

import { SettingsLoginHistoryCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-login-history-card"
import { SettingsPasswordCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-password-card"
import { SettingsSessionsCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-sessions-card"
import { SettingsSignInMethodsCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-sign-in-methods-card"
import { SettingsTwoFactorCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-two-factor-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

const AdminSettingsSecurityRoute = (): JSX.Element => {
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())

  return (
    <SettingsPageLayout active="security">
      <SettingsPasswordCard hasPassword={profile.hasPassword} />
      <SettingsTwoFactorCard enabled={profile.twoFactorEnabled} hasPassword={profile.hasPassword} />
      <SettingsSignInMethodsCard hasGoogle={profile.hasGoogle} hasPassword={profile.hasPassword} />
      <SettingsSessionsCard />
      <SettingsLoginHistoryCard />
    </SettingsPageLayout>
  )
}

export const Route = createFileRoute("/admin/settings/security")({
  component: AdminSettingsSecurityRoute,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(getCustomerProfileQuery()),
      context.queryClient.query(listCustomerSessionsQuery()),
      context.queryClient.query(listCustomerLoginHistoryQuery()),
    ])
  },
})

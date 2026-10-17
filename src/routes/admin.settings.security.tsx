import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { LIST_PAGE_FIRST } from "~/src/modules/_core/utils/pagination"
import { CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerLoginHistoryPageQuery } from "~/src/modules/customer-account/use-cases/get-customer-login-history-page"
import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"

import { SettingsLoginHistoryGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/components/settings-login-history-grid"
import { SettingsSessionsGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/components/settings-sessions-grid"
import { SettingsPasswordCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-password-card"
import { SettingsSignInMethodsCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-sign-in-methods-card"
import { SettingsTwoFactorCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-two-factor-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

const AdminSettingsSecurityRoute = (): JSX.Element => {
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())

  return (
    <SettingsPageLayout active="security">
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-3">
        <SettingsPasswordCard hasPassword={profile.hasPassword} />
        <SettingsTwoFactorCard enabled={profile.twoFactorEnabled} hasPassword={profile.hasPassword} />
        <SettingsSignInMethodsCard hasGoogle={profile.hasGoogle} hasPassword={profile.hasPassword} />
      </div>
      <SettingsSessionsGrid />
      <SettingsLoginHistoryGrid />
    </SettingsPageLayout>
  )
}

export const Route = createFileRoute("/admin/settings/security")({
  component: AdminSettingsSecurityRoute,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(getCustomerProfileQuery()),
      context.queryClient.query(listCustomerSessionsQuery()),
      context.queryClient.query(
        getCustomerLoginHistoryPageQuery({ page: LIST_PAGE_FIRST, pageSize: CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE }),
      ),
    ])
  },
})

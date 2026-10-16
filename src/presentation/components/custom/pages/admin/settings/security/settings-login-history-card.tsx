import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { listCustomerLoginHistoryQuery } from "~/src/modules/customer-account/use-cases/list-customer-login-history"

import { LoginHistoryList } from "~/src/presentation/components/custom/pages/account/sessions/login-history-list"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsLoginHistoryCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.history")
  const { data: entries } = useSuspenseQuery(listCustomerLoginHistoryQuery())

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <div className="px-4 pb-4 lg:px-5">
        <LoginHistoryList entries={entries} />
      </div>
    </SettingsCard>
  )
}

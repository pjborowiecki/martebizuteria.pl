import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { LoginHistoryStatusFilter } from "~/src/presentation/components/custom/pages/admin/settings/security/components/login-history-status-filter"
import { useLoginHistoryDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/hooks/use-login-history-data-grid"
import { loginHistoryDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/utils/login-history-data-grid"
import { SettingsGridSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-grid-section"
import { SettingsRefreshAction } from "~/src/presentation/components/custom/pages/admin/settings/settings-refresh-action"

const LOGIN_HISTORY_QUERY_KEYS = [CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY]

export const SettingsLoginHistoryGrid = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.history")
  const grid = useLoginHistoryDataGrid()

  return (
    <SettingsGridSection className="lg:max-h-[min(44rem,calc(100dvh-10rem))]" description={t("description")} title={t("title")}>
      <Provider value={grid}>
        <DataGridShell>
          <Toolbar>
            <SettingsRefreshAction queryKeys={LOGIN_HISTORY_QUERY_KEYS} />
            <Export />
            <LoginHistoryStatusFilter />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </Provider>
    </SettingsGridSection>
  )
}

const { Body, Export, Pagination, Provider, Toolbar } = loginHistoryDataGrid

import { type JSX, useMemo } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/customer-account/use-cases/revoke-other-customer-sessions"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { useSessionsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/hooks/use-sessions-data-grid"
import { sessionsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/utils/sessions-data-grid"
import { SettingsGridSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-grid-section"
import { SettingsRefreshAction } from "~/src/presentation/components/custom/pages/admin/settings/settings-refresh-action"

const SESSIONS_QUERY_KEYS = [CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS]

const SignOutOtherDevicesButton = (): JSX.Element | undefined => {
  const tSessions = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const { data: sessions } = useSuspenseQuery(listCustomerSessionsQuery())
  const revokeOthers = useMutation({
    ...revokeOtherCustomerSessionsMutation,
    onError: () => {
      toast.error(tSessions("revokeOtherDevicesError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
      toast.success(tSessions("revokeOtherDevicesSuccess"))
    },
  })

  if (sessions.every((session) => session.isCurrent)) {
    return undefined
  }

  return (
    <Button
      className="h-9 gap-2 text-xs"
      disabled={revokeOthers.isPending}
      onClick={() => {
        revokeOthers.mutate()
      }}
      size="sm"
      variant="outline"
    >
      {revokeOthers.isPending ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <LogOut className="size-3.5" strokeWidth={1.5} />
      )}
      {tSessions("revokeOtherDevices")}
    </Button>
  )
}

export const SettingsSessionsGrid = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const grid = useSessionsDataGrid()
  const toolbarActions = useMemo(() => <SignOutOtherDevicesButton />, [])

  return (
    <SettingsGridSection description={t("description")} title={t("title")}>
      <Provider value={grid}>
        <DataGridShell>
          <Toolbar actions={toolbarActions}>
            <SettingsRefreshAction queryKeys={SESSIONS_QUERY_KEYS} />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </Provider>
    </SettingsGridSection>
  )
}

const { Body, Pagination, Provider, Toolbar } = sessionsDataGrid

import { type JSX, useCallback } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/customer-account/use-cases/revoke-other-customer-sessions"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ActiveSessionList } from "~/src/presentation/components/custom/pages/account/sessions/active-session-list"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsSessionsCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.sessions")
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

  const signOutOthers = useCallback(() => {
    revokeOthers.mutate()
  }, [revokeOthers])

  return (
    <SettingsCard
      action={
        sessions.some((session) => !session.isCurrent) && (
          <Button
            className="shrink-0 gap-1.5 self-start"
            disabled={revokeOthers.isPending}
            onClick={signOutOthers}
            size="sm"
            variant="outline"
          >
            {revokeOthers.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
            {tSessions("revokeOtherDevices")}
          </Button>
        )
      }
      description={t("description")}
      title={t("title")}
    >
      <div className="px-4 lg:px-5">
        <ActiveSessionList sessions={sessions} />
      </div>
    </SettingsCard>
  )
}

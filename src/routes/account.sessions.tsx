import { type JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { LIST_PAGE_FIRST } from "~/src/modules/_core/utils/pagination"
import { CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE } from "~/src/modules/audit-log/audit-log.constants"
import { getCustomerLoginHistoryPageQuery } from "~/src/modules/audit-log/use-cases/get-customer-login-history-page"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { listCustomerSessionsQuery } from "~/src/modules/session/use-cases/list-customer-sessions"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/session/use-cases/revoke-other-customer-sessions"

import { accountPageMeta, pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ActiveSessionList } from "~/src/presentation/components/custom/pages/account/sessions/active-session-list"
import { LoginHistoryList } from "~/src/presentation/components/custom/pages/account/sessions/login-history-list"

const SessionsPage = (): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const { data: sessions } = useSuspenseQuery(listCustomerSessionsQuery())
  const revokeOtherDevicesMutation = useMutation({
    ...revokeOtherCustomerSessionsMutation,
    onError: () => {
      toast.error(t("revokeOtherDevicesError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.CUSTOMER.SESSIONS,
      })
      toast.success(t("revokeOtherDevicesSuccess"))
    },
  })

  const hasOtherDevices = sessions.some((session) => !session.isCurrent)
  const handleRevokeOtherDevices = (): void => {
    revokeOtherDevicesMutation.mutate()
  }

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("activeSessions")}</h2>
          {hasOtherDevices && (
            <Button
              className="text-destructive/70 hover:text-destructive"
              disabled={revokeOtherDevicesMutation.isPending}
              onClick={handleRevokeOtherDevices}
              variant="account-ghost"
            >
              {t("revokeOtherDevices")}
            </Button>
          )}
        </div>
        <Separator className="mt-3 mb-0" />
        <ActiveSessionList sessions={sessions} />
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("loginHistory")}</h2>
        <Separator className="mt-3 mb-0" />
        <LoginHistoryList />
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("securityTips")}</h2>
        <Separator className="mt-3 mb-4" />
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <li>{t("tip1")}</li>
          <li>{t("tip2")}</li>
          <li>{t("tip3")}</li>
        </ul>
      </section>
    </div>
  )
}

export const Route = createFileRoute("/account/sessions")({
  component: SessionsPage,
  head: pageHead,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...listCustomerSessionsQuery(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...getCustomerLoginHistoryPageQuery({ page: LIST_PAGE_FIRST, pageSize: CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE }),
        staleTime: "static",
      }),
    ])

    return accountPageMeta(context.queryClient, context.locale, "sessions")
  },
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})

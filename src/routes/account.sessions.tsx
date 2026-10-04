import { type JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { listCustomerLoginHistoryQuery } from "~/src/modules/customer-account/use-cases/list-customer-login-history"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/customer-account/use-cases/revoke-other-customer-sessions"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ActiveSessionList } from "~/src/presentation/components/custom/pages/account/sessions/active-session-list"
import { LoginHistoryList } from "~/src/presentation/components/custom/pages/account/sessions/login-history-list"

const SessionsPage = (): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const { data: sessions } = useSuspenseQuery(listCustomerSessionsQuery())
  const { data: loginHistory } = useSuspenseQuery(listCustomerLoginHistoryQuery())
  const revokeOtherDevicesMutation = useMutation({
    ...revokeOtherCustomerSessionsMutation,
    onError: () => {
      toast.error(t("revokeOtherDevicesError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS,
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
        <LoginHistoryList entries={loginHistory} />
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
        ...listCustomerLoginHistoryQuery(),
        staleTime: "static",
      }),
    ])

    return accountPageMeta(context.queryClient, context.locale, "sessions")
  },
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})

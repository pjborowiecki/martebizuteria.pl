import { type JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle } from "lucide-react"
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

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { ActiveSessionList } from "~/src/presentation/components/custom/pages/account/sessions/active-session-list"
import { LoginHistoryList } from "~/src/presentation/components/custom/pages/account/sessions/login-history-list"

import { ROUTES } from "~/src/routes"

const SessionsPage = (): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const { data: sessions } = useSuspenseQuery(listCustomerSessionsQuery())
  const { data: loginHistory } = useSuspenseQuery(listCustomerLoginHistoryQuery())
  const revokeAllMutation = useMutation({
    ...revokeOtherCustomerSessionsMutation,
    onError: () => {
      toast.error(t("revokeError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS,
      })
      toast.success(t("revokeAllSuccess"))
    },
  })

  const hasOtherSessions = sessions.some((session) => !session.isCurrent)
  const handleRevokeAll = (): void => {
    revokeAllMutation.mutate()
  }

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("activeSessions")}</h2>
          <Button
            className="text-destructive/70 hover:text-destructive"
            disabled={!hasOtherSessions || revokeAllMutation.isPending}
            onClick={handleRevokeAll}
            variant="account-ghost"
          >
            {t("revokeAll")}
          </Button>
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

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-destructive/70 uppercase">{t("closeAccount")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="flex items-start gap-4 py-5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/60" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px]">{t("closeAccountTitle")}</p>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("closeAccountDesc")}</p>
            <LocalizedLink
              className="mt-4 inline-flex h-9 items-center justify-center border border-destructive/30 px-6 text-[11px] tracking-[0.15em] text-destructive uppercase transition-colors hover:border-destructive hover:bg-destructive/5"
              to={ROUTES.ACCOUNT_PROFILE}
            >
              {t("closeAccountAction")}
            </LocalizedLink>
          </div>
        </div>
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

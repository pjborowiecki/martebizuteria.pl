import { type JSX, useCallback } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Globe, LogOut, Monitor, Smartphone, Tablet } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { formatCustomerAccountRelativeTime } from "~/src/modules/customer-account/customer-account.utils"
import { listCustomerLoginHistoryQuery } from "~/src/modules/customer-account/use-cases/list-customer-login-history"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"
import { revokeCustomerSessionMutation } from "~/src/modules/customer-account/use-cases/revoke-customer-session"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/customer-account/use-cases/revoke-other-customer-sessions"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

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

  const otherSessions = sessions.filter((session) => !session.isCurrent)
  const handleRevokeAll = useCallback(() => {
    revokeAllMutation.mutate()
  }, [revokeAllMutation])

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
            variant="account-ghost"
            className="text-destructive/70 hover:text-destructive"
            disabled={otherSessions.length === 0 || revokeAllMutation.isPending}
            onClick={handleRevokeAll}
          >
            {t("revokeAll")}
          </Button>
        </div>
        <Separator className="mt-3 mb-0" />
        {sessions.length === 0 ? (
          <p className="py-6 text-[13px] text-muted-foreground">{t("emptySessions")}</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("loginHistory")}</h2>
        <Separator className="mt-3 mb-0" />
        {loginHistory.length === 0 ? (
          <p className="py-6 text-[13px] text-muted-foreground">{t("noLoginHistory")}</p>
        ) : (
          <div className="divide-y divide-border">
            {loginHistory.map((entry) => (
              <LoginHistoryItem key={`${entry.createdAt.toISOString()}-${entry.status}`} entry={entry} />
            ))}
          </div>
        )}
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
              to={ROUTES.ACCOUNT_PROFILE}
              className="mt-4 inline-flex h-9 items-center justify-center border border-destructive/30 px-6 text-[11px] tracking-[0.15em] text-destructive uppercase transition-colors hover:border-destructive hover:bg-destructive/5"
            >
              {t("closeAccountAction")}
            </LocalizedLink>
          </div>
        </div>
      </section>
    </div>
  )
}

const formatSessionLastActive = (
  session: CustomerAccount["session"],
  locale: string,
  t: ReturnType<typeof useTranslations<"pages.account.sessions">>,
): string => {
  const diffMinutes = Math.floor((Date.now() - session.lastActiveAt.getTime()) / MILLISECONDS_PER_MINUTE)
  if (diffMinutes < ACTIVE_NOW_MINUTES) {
    return t("activeNow")
  }

  return formatCustomerAccountRelativeTime(session.lastActiveAt, locale)
}

const ActiveSessionCard = ({
  session,
}: Readonly<{
  session: CustomerAccount["session"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const DeviceIcon = DEVICE_ICONS[session.deviceType]
  const revokeMutation = useMutation({
    ...revokeCustomerSessionMutation,
    onError: () => {
      toast.error(t("revokeError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS,
      })
      toast.success(t("revokeSuccess"))
    },
  })

  const handleRevoke = useCallback(() => {
    revokeMutation.mutate({ sessionId: session.id })
  }, [revokeMutation, session.id])

  return (
    <div className="group flex items-center gap-5 py-5">
      <div className="flex size-10 shrink-0 items-center justify-center bg-muted/50">
        <DeviceIcon className="size-4 text-muted-foreground" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] tracking-[0.02em]">{session.device}</p>
          {session.isCurrent ? (
            <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase">
              <span className="size-1.5 rounded-full bg-green-500" />
              {t("current")}
            </span>
          ) : undefined}
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {session.browser}
          {session.ipAddress === undefined ? "" : ` · ${session.ipAddress}`}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{formatSessionLastActive(session, locale, t)}</p>
      </div>
      {session.isCurrent ? undefined : (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleRevoke}
          disabled={revokeMutation.isPending}
        >
          <LogOut className="size-4 text-muted-foreground transition-colors hover:text-destructive" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  )
}

const LoginHistoryItem = ({
  entry,
}: Readonly<{
  entry: CustomerAccount["loginHistoryItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const format = useFormatter()

  return (
    <div className="flex items-center gap-5 py-4">
      <div className="flex size-8 shrink-0 items-center justify-center">
        <Globe className="size-3.5 text-muted-foreground/40" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{entry.detail ?? t(`loginStatus.${entry.status}`)}</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {format.dateTime(entry.createdAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <p
          className={`mt-0.5 text-[10px] tracking-widest uppercase ${entry.status === "blocked" ? "text-destructive" : "text-muted-foreground/50"}`}
        >
          {t(`loginStatus.${entry.status}`)}
        </p>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/account/sessions")({
  component: SessionsPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...listCustomerSessionsQuery(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...listCustomerLoginHistoryQuery(),
        staleTime: "static",
      }),
    ]),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Monitor,
}

const ACTIVE_NOW_MINUTES = 5

const MILLISECONDS_PER_MINUTE = 60_000

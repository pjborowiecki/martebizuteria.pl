import { type JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { revokeCustomerSessionMutation } from "~/src/modules/customer-account/use-cases/revoke-customer-session"

import { Button } from "~/src/presentation/components/shadcn/button"

import { formatSessionLastActive } from "~/src/presentation/components/custom/pages/account/sessions/format-session-last-active"
import { SessionCurrentBadge } from "~/src/presentation/components/custom/pages/account/sessions/session-current-badge"

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Monitor,
}

export const ActiveSessionCard = ({
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

  const handleRevoke = (): void => {
    revokeMutation.mutate({ sessionId: session.id })
  }

  return (
    <div className="flex items-center gap-5 py-5">
      <div className="flex size-10 shrink-0 items-center justify-center bg-muted/50">
        <DeviceIcon className="size-4 text-muted-foreground" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] tracking-[0.02em]">{session.device}</p>
          {session.isCurrent && <SessionCurrentBadge />}
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {session.browser}
          {session.ipAddress === undefined ? "" : ` · ${session.ipAddress}`}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {formatSessionLastActive(session.lastActiveAt, locale, t("activeNow"))}
        </p>
      </div>
      {session.isCurrent ? undefined : (
        <Button
          aria-label={t("revokeDevice", { device: session.device })}
          className="shrink-0"
          disabled={revokeMutation.isPending}
          onClick={handleRevoke}
          size="icon-xs"
          variant="ghost"
        >
          <LogOut className="size-4 text-muted-foreground transition-colors hover:text-destructive" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  )
}

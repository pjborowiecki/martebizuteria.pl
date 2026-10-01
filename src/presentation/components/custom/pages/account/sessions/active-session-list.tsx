import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { ActiveSessionCard } from "~/src/presentation/components/custom/pages/account/sessions/active-session-card"

export const ActiveSessionList = ({
  sessions,
}: Readonly<{
  sessions: readonly CustomerAccount["session"][]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const hasOtherDevices = sessions.some((session) => !session.isCurrent)

  return (
    <div className="divide-y divide-border">
      {sessions.map((session) => (
        <ActiveSessionCard key={session.id} session={session} />
      ))}
      {hasOtherDevices ? undefined : <p className="py-6 text-[13px] text-muted-foreground">{t("emptySessions")}</p>}
    </div>
  )
}

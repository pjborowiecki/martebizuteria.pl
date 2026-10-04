import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { LoginHistoryItem } from "~/src/presentation/components/custom/pages/account/sessions/login-history-item"

export const LoginHistoryList = ({
  entries,
}: Readonly<{
  entries: readonly CustomerAccount["loginHistoryItem"][]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")

  if (entries.length === 0) {
    return <p className="py-6 text-[13px] text-muted-foreground">{t("noLoginHistory")}</p>
  }

  return (
    <>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <LoginHistoryItem entry={entry} key={`${entry.createdAt.toISOString()}-${entry.status}`} />
        ))}
      </div>
      {entries.length === CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT && (
        <p className="pt-4 text-[11px] text-muted-foreground">{t("loginHistoryLimit", { count: CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT })}</p>
      )}
    </>
  )
}

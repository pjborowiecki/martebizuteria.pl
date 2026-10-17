import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

export const SettingsSignInMethodsCard = ({ hasGoogle, hasPassword }: Readonly<SettingsSignInMethodsCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.signInMethods")
  const status = (connected: boolean): JSX.Element => (
    <SettingsStatusBadge label={connected ? t("connected") : t("notConnected")} tone={connected ? "positive" : "neutral"} />
  )

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <SettingsRow action={status(hasPassword)} label={t("password")} />
      <SettingsRow action={status(hasGoogle)} label={t("google")}>
        {hasGoogle ? <AdminDialogNote kind="warning">{t("googleNotice")}</AdminDialogNote> : undefined}
      </SettingsRow>
    </SettingsCard>
  )
}

interface SettingsSignInMethodsCardProps {
  readonly hasGoogle: boolean
  readonly hasPassword: boolean
}

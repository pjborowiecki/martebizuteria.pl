import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsSignInMethodsCard = ({ hasGoogle, hasPassword }: Readonly<SettingsSignInMethodsCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.signInMethods")
  const status = (connected: boolean): JSX.Element => (
    <Badge variant={connected ? "default" : "secondary"}>{connected ? t("connected") : t("notConnected")}</Badge>
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

import { type JSX, useCallback, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

import { ChangeEmailDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-email-dialog"
import { SettingsEditableRow } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-editable-row"
import { useSaveProfileField } from "~/src/presentation/components/custom/pages/admin/settings/account/use-save-profile-field"
import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsProfileCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const format = useFormatter()
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())
  const saveField = useSaveProfileField()
  const [changingEmail, setChangingEmail] = useState(false)

  const openEmailDialog = useCallback(() => {
    setChangingEmail(true)
  }, [])

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <SettingsEditableRow field="name" label={t("name")} onSave={saveField} value={profile.name} />
      <SettingsRow
        action={
          <Button className="self-start sm:self-auto" onClick={openEmailDialog} size="sm" variant="outline">
            {t("change")}
          </Button>
        }
        label={t("email")}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all text-foreground">{profile.email}</span>
          {!profile.emailVerified && <Badge variant="secondary">{t("emailUnverified")}</Badge>}
        </span>
      </SettingsRow>
      <SettingsEditableRow emptyLabel={t("phoneEmpty")} field="phone" label={t("phone")} onSave={saveField} value={profile.phone} />
      <SettingsRow label={t("memberSince")}>
        <span className="text-foreground">{format.dateTime(profile.createdAt, { dateStyle: "long" })}</span>
      </SettingsRow>
      <ChangeEmailDialog currentEmail={profile.email} onOpenChange={setChangingEmail} open={changingEmail} variant="default" />
    </SettingsCard>
  )
}

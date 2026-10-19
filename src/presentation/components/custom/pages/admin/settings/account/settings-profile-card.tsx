import { type JSX, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Mail, Pencil } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getCustomerProfileQuery } from "~/src/modules/user/use-cases/get-customer-profile"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ChangeEmailDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-email-dialog"
import { SettingsProfileSheet } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-profile-sheet"
import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

export const SettingsProfileCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const format = useFormatter()
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())
  const [editing, setEditing] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)

  return (
    <SettingsCard
      action={
        <Button
          className="shrink-0 gap-1.5 self-start"
          onClick={() => {
            setEditing(true)
          }}
          size="sm"
          variant="outline"
        >
          <Pencil className="size-3.5" strokeWidth={1.5} />
          {t("edit")}
        </Button>
      }
      description={t("description")}
      title={t("title")}
    >
      <SettingsRow label={t("name")}>
        <span className="text-foreground">{profile.name}</span>
      </SettingsRow>
      <SettingsRow
        action={
          <Button
            className="shrink-0 gap-1.5 self-start"
            onClick={() => {
              setChangingEmail(true)
            }}
            size="sm"
            variant="outline"
          >
            <Mail className="size-3.5" strokeWidth={1.5} />
            {t("change")}
          </Button>
        }
        label={t("email")}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all text-foreground">{profile.email}</span>
          {!profile.emailVerified && <SettingsStatusBadge label={t("emailUnverified")} tone="warning" />}
        </span>
      </SettingsRow>
      <SettingsRow label={t("phone")}>
        {profile.phone === undefined ? t("phoneEmpty") : <span className="text-foreground">{profile.phone}</span>}
      </SettingsRow>
      <SettingsRow label={t("memberSince")}>
        <span className="text-foreground">{format.dateTime(profile.createdAt, { dateStyle: "long" })}</span>
      </SettingsRow>
      {editing && (
        <SettingsProfileSheet
          onClose={() => {
            setEditing(false)
          }}
          profile={profile}
        />
      )}
      <ChangeEmailDialog
        currentEmail={profile.email}
        hasPassword={profile.hasPassword}
        onOpenChange={setChangingEmail}
        open={changingEmail}
        variant="default"
      />
    </SettingsCard>
  )
}

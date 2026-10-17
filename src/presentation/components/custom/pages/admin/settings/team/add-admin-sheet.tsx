import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { Search, ShieldCheck, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { SettingsFormSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-form-section"
import {
  SettingsSheet,
  SettingsSheetCancelButton,
  SettingsSheetSubmitButton,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-sheet"
import { TeamCandidateSearch } from "~/src/presentation/components/custom/pages/admin/settings/team/team-candidate-search"
import { useTeamAccess } from "~/src/presentation/components/custom/pages/admin/settings/team/use-team-access"

const ADD_ADMIN_FORM_ID = "add-admin-form"

const ADMIN_ALLOWANCES = ["allowsOrders", "allowsCatalog", "allowsCustomers", "allowsSettings"] as const

const TEAM_RULES = ["verified", "self", "recentSignIn", "signOut", "deletion", "audit"] as const

const TeamRulesSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.rules")

  return (
    <SettingsFormSection description={t("description")} icon={ShieldCheck} title={t("title")}>
      <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground">
        {TEAM_RULES.map((rule) => (
          <li key={rule}>{t(rule)}</li>
        ))}
      </ul>
    </SettingsFormSection>
  )
}

const ChosenAdminSection = ({ chosen }: Readonly<{ chosen: User["teamCandidate"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")

  return (
    <SettingsFormSection description={t("confirmIntro", { email: chosen.email })} icon={UserPlus} title={chosen.name}>
      <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-foreground">
        {ADMIN_ALLOWANCES.map((allowance) => (
          <li key={allowance}>{t(allowance)}</li>
        ))}
      </ul>
      {isAdminTwoFactorRequired() && !chosen.twoFactorEnabled && <AdminDialogNote kind="warning">{t("twoFactorRequired")}</AdminDialogNote>}
    </SettingsFormSection>
  )
}

export const AddAdminSheet = ({ onClose }: Readonly<{ onClose: () => void }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")
  const { grant } = useTeamAccess()
  const [chosen, setChosen] = useState<User["teamCandidate"]>()

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      if (chosen === undefined) {
        return
      }

      grant.mutate(
        { userId: chosen.id },
        {
          onSettled: onClose,
          onSuccess: () => {
            toast.success(t("granted", { name: chosen.name }))
          },
        },
      )
    },
    [chosen, grant, onClose, t],
  )

  return (
    <SettingsSheet
      description={chosen === undefined ? t("description") : t("confirmDescription")}
      footer={
        chosen === undefined ? (
          <SettingsSheetCancelButton disabled={false} label={t("cancel")} onClick={onClose} />
        ) : (
          <>
            <SettingsSheetCancelButton
              disabled={grant.isPending}
              label={t("back")}
              onClick={() => {
                setChosen(undefined)
              }}
            />
            <SettingsSheetSubmitButton formId={ADD_ADMIN_FORM_ID} isPending={grant.isPending} label={t("confirm")} />
          </>
        )
      }
      formId={ADD_ADMIN_FORM_ID}
      isPending={grant.isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={chosen === undefined ? t("title") : t("confirmTitle", { name: chosen.name })}
    >
      {chosen === undefined ? (
        <>
          <SettingsFormSection icon={Search} title={t("find")}>
            <TeamCandidateSearch onChoose={setChosen} />
          </SettingsFormSection>
          <TeamRulesSection />
        </>
      ) : (
        <ChosenAdminSection chosen={chosen} />
      )}
    </SettingsSheet>
  )
}

import { type JSX, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { UserPlus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"
import { type User } from "~/src/modules/user/user.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { AddAdminDialog } from "~/src/presentation/components/custom/pages/admin/settings/team/add-admin-dialog"
import { RemoveAdminDialog } from "~/src/presentation/components/custom/pages/admin/settings/team/remove-admin-dialog"
import { SignInAgainButton } from "~/src/presentation/components/custom/pages/admin/settings/team/sign-in-again-button"
import { TeamMemberRow } from "~/src/presentation/components/custom/pages/admin/settings/team/team-member-row"

export const SettingsTeamCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.admins")
  const { data: team } = useSuspenseQuery(listAdminTeamQuery())
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<User["adminTeamMember"]>()

  return (
    <SettingsCard
      action={
        <Button
          className="shrink-0 gap-1.5 self-start"
          disabled={!team.recentSignIn}
          onClick={() => {
            setAdding(true)
          }}
          size="sm"
          variant="outline"
        >
          <UserPlus aria-hidden />
          {t("add")}
        </Button>
      }
      description={t("description")}
      title={t("title")}
    >
      {!team.recentSignIn && (
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
          <AdminDialogNote kind="warning">{t("recentSignInNeeded")}</AdminDialogNote>
          <SignInAgainButton />
        </div>
      )}
      {team.members.map((member) => (
        <TeamMemberRow
          canChange={team.recentSignIn}
          key={member.id}
          member={member}
          onRemove={() => {
            setRemoving(member)
          }}
        />
      ))}
      {adding && (
        <AddAdminDialog
          onClose={() => {
            setAdding(false)
          }}
        />
      )}
      {removing !== undefined && (
        <RemoveAdminDialog
          member={removing}
          onClose={() => {
            setRemoving(undefined)
          }}
        />
      )}
    </SettingsCard>
  )
}

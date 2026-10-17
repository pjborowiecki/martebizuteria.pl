import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"

export const TeamMemberRow = ({ canChange, member, onRemove }: Readonly<TeamMemberRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.admins")
  const format = useFormatter()
  const methods = [member.hasPassword ? t("password") : undefined, member.hasGoogle ? t("google") : undefined].filter(
    (method) => method !== undefined,
  )

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 lg:px-5" data-slot="settings-row">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13px] leading-5 font-medium text-foreground">{member.name}</p>
          {member.isCurrentUser && <Badge variant="outline">{t("you")}</Badge>}
          <Badge variant={member.twoFactorEnabled ? "secondary" : "destructive"}>
            {member.twoFactorEnabled ? t("twoFactorOn") : t("twoFactorOff")}
          </Badge>
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{member.email}</p>
        <p className="text-[12px] text-muted-foreground">
          {methods.length === 0 ? t("noSignInMethod") : t("signInMethods", { methods: format.list(methods) })}
          {" · "}
          {member.lastSignInAt === undefined
            ? t("neverSignedIn")
            : t("lastSignIn", { date: format.dateTime(member.lastSignInAt, { dateStyle: "medium", timeStyle: "short" }) })}
        </p>
        {isAdminTwoFactorRequired() && !member.twoFactorEnabled && (
          <AdminDialogNote kind="warning">{t("twoFactorPending")}</AdminDialogNote>
        )}
        {member.isCurrentUser && <p className="text-[12px] text-muted-foreground">{t("ownAccess")}</p>}
      </div>
      {!member.isCurrentUser && (
        <Button
          aria-label={t("removeLabel", { name: member.name })}
          className="shrink-0 self-start"
          disabled={!canChange}
          onClick={onRemove}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("remove")}
        </Button>
      )}
    </div>
  )
}

interface TeamMemberRowProps {
  readonly canChange: boolean
  readonly member: User["adminTeamMember"]
  readonly onRemove: () => void
}

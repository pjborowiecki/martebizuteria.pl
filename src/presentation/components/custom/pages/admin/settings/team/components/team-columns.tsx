import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { TEAM_TABLE_COLUMN_ID, TEAM_TABLE_COLUMN_SIZE } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import {
  SettingsStatusBadge,
  type SettingsStatusTone,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"
import { TeamRowActions } from "~/src/presentation/components/custom/pages/admin/settings/team/components/team-row-actions"

const columnHelper = createColumnHelper<DataGridFeatures, User["adminTeamMember"]>()

const TeamNameCell = ({ member }: Readonly<{ member: User["adminTeamMember"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team")

  return (
    <div className="flex min-w-0 items-center gap-2">
      <CatalogTruncatedTextCell className="font-medium" muted={false} text={member.name} />
      {member.isCurrentUser && <SettingsStatusBadge label={t("admins.you")} tone="neutral" />}
    </div>
  )
}

export const teamSignInMethods = (
  member: User["adminTeamMember"],
  t: TeamColumnContext["t"],
  format: TeamColumnContext["format"],
): string => {
  const methods = [member.hasPassword ? t("admins.password") : undefined, member.hasGoogle ? t("admins.google") : undefined].filter(
    (method) => method !== undefined,
  )

  return methods.length === 0 ? t("admins.noSignInMethod") : format.list(methods)
}

export const teamLastSignIn = (member: User["adminTeamMember"], t: TeamColumnContext["t"], format: TeamColumnContext["format"]): string =>
  member.lastSignInAt === undefined
    ? t("admins.neverSignedIn")
    : format.dateTime(member.lastSignInAt, { dateStyle: "medium", timeStyle: "short" })

const teamTwoFactorTone = (member: User["adminTeamMember"]): SettingsStatusTone => {
  if (member.twoFactorEnabled) {
    return "positive"
  }

  return isAdminTwoFactorRequired() ? "negative" : "warning"
}

export const teamTwoFactorLabel = (member: User["adminTeamMember"], t: TeamColumnContext["t"]): string =>
  member.twoFactorEnabled ? t("admins.twoFactorOn") : t("admins.twoFactorOff")

const buildTeamColumns = ({ format, t }: TeamColumnContext) =>
  columnHelper.columns([
    columnHelper.accessor("name", {
      cell: ({ row }) => <TeamNameCell member={row.original} />,
      header: t("columns.name"),
      id: TEAM_TABLE_COLUMN_ID.name,
      meta: { exportValue: (row) => row.name, skeletonVariant: "title" },
      size: TEAM_TABLE_COLUMN_SIZE.name,
    }),
    columnHelper.accessor("email", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell muted={false} text={getValue()} />,
      header: t("columns.email"),
      id: TEAM_TABLE_COLUMN_ID.email,
      meta: { exportValue: (row) => row.email, skeletonVariant: "text" },
      size: TEAM_TABLE_COLUMN_SIZE.email,
    }),
    columnHelper.accessor("twoFactorEnabled", {
      cell: ({ row }) => <SettingsStatusBadge label={teamTwoFactorLabel(row.original, t)} tone={teamTwoFactorTone(row.original)} />,
      header: t("columns.twoFactor"),
      id: TEAM_TABLE_COLUMN_ID.twoFactor,
      meta: { exportValue: (row) => teamTwoFactorLabel(row, t), skeletonVariant: "badge" },
      size: TEAM_TABLE_COLUMN_SIZE.twoFactor,
    }),
    columnHelper.accessor((row) => teamSignInMethods(row, t, format), {
      cell: ({ getValue }) => <CatalogTruncatedTextCell text={getValue()} />,
      header: t("columns.signInMethods"),
      id: TEAM_TABLE_COLUMN_ID.signInMethods,
      meta: { exportValue: (row) => teamSignInMethods(row, t, format), skeletonVariant: "text" },
      size: TEAM_TABLE_COLUMN_SIZE.signInMethods,
    }),
    columnHelper.accessor((row) => row.lastSignInAt?.getTime(), {
      cell: ({ row }) => (
        <span className={row.original.lastSignInAt === undefined ? CATALOG_DATAGRID_EMPTY_TEXT_CLASS : "text-muted-foreground"}>
          {teamLastSignIn(row.original, t, format)}
        </span>
      ),
      header: t("columns.lastSignIn"),
      id: TEAM_TABLE_COLUMN_ID.lastSignIn,
      meta: { exportValue: (row) => teamLastSignIn(row, t, format), fillsRemainingWidth: true, skeletonVariant: "date" },
      size: TEAM_TABLE_COLUMN_SIZE.lastSignIn,
    }),
    columnHelper.display({
      cell: ({ row }) => <TeamRowActions member={row.original} />,
      enableHiding: false,
      enableSorting: false,
      id: TEAM_TABLE_COLUMN_ID.actions,
      meta: { cellClassName: "pr-4 text-right", headClassName: "pr-4", preventRowClick: true, skeletonVariant: "iconEnd" },
      ...fixedDataGridColumnWidth(TEAM_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const useTeamColumns = () => {
  const t = useTranslations("pages.admin.settings.team")
  const format = useFormatter()

  return useMemo(() => buildTeamColumns({ format, t }), [format, t])
}

interface TeamColumnContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly t: ReturnType<typeof useTranslations<"pages.admin.settings.team">>
}

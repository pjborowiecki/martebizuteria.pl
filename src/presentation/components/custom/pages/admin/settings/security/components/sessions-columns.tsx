import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { Monitor, Smartphone, Tablet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { SESSION_TABLE_COLUMN_ID, SESSION_TABLE_COLUMN_SIZE } from "~/src/modules/session/session.constants"
import { type Session } from "~/src/modules/session/session.types"

import { useDisplayPreferences, useFormatter } from "~/src/hooks/use-display-format"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { formatSessionLastActive } from "~/src/presentation/components/custom/pages/account/sessions/format-session-last-active"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { SessionsRowActions } from "~/src/presentation/components/custom/pages/admin/settings/security/components/sessions-row-actions"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

const columnHelper = createColumnHelper<DataGridFeatures, Session["customerSession"]>()

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet, unknown: Monitor } as const

const SessionDeviceCell = ({ session }: Readonly<{ session: Session["customerSession"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const DeviceIcon = DEVICE_ICONS[session.deviceType]

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <DeviceIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <CatalogTruncatedTextCell className="font-medium" muted={false} text={session.device} />
      {session.isCurrent && <SettingsStatusBadge label={t("thisDevice")} tone="positive" />}
    </div>
  )
}

const buildSessionColumns = ({ format, lastActive, t }: SessionColumnContext) =>
  columnHelper.columns([
    columnHelper.accessor("device", {
      cell: ({ row }) => <SessionDeviceCell session={row.original} />,
      header: t("columns.device"),
      id: SESSION_TABLE_COLUMN_ID.device,
      meta: { exportValue: (row) => row.device, skeletonVariant: "title" },
      size: SESSION_TABLE_COLUMN_SIZE.device,
    }),
    columnHelper.accessor("browser", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell muted={false} text={getValue()} />,
      header: t("columns.browser"),
      id: SESSION_TABLE_COLUMN_ID.browser,
      meta: { exportValue: (row) => row.browser, skeletonVariant: "text" },
      size: SESSION_TABLE_COLUMN_SIZE.browser,
    }),
    columnHelper.accessor("ipAddress", {
      cell: ({ getValue }) => {
        const ipAddress = getValue()

        return ipAddress === undefined ? (
          <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>{t("unknownAddress")}</span>
        ) : (
          <span className="font-mono text-xs">{ipAddress}</span>
        )
      },
      header: t("columns.ipAddress"),
      id: SESSION_TABLE_COLUMN_ID.ipAddress,
      meta: { exportValue: (row) => row.ipAddress, skeletonVariant: "text" },
      size: SESSION_TABLE_COLUMN_SIZE.ipAddress,
    }),
    columnHelper.accessor("lastActiveAt", {
      cell: ({ getValue }) => <span className="text-muted-foreground">{lastActive(getValue())}</span>,
      header: t("columns.lastActive"),
      id: SESSION_TABLE_COLUMN_ID.lastActive,
      meta: { exportValue: (row) => lastActive(row.lastActiveAt), skeletonVariant: "date" },
      size: SESSION_TABLE_COLUMN_SIZE.lastActive,
    }),
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{format.dateTime(getValue(), { dateStyle: "medium", timeStyle: "short" })}</span>
      ),
      header: t("columns.signedIn"),
      id: SESSION_TABLE_COLUMN_ID.signedIn,
      meta: {
        exportValue: (row) => format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" }),
        fillsRemainingWidth: true,
        skeletonVariant: "date",
      },
      size: SESSION_TABLE_COLUMN_SIZE.signedIn,
    }),
    columnHelper.display({
      cell: ({ row }) => <SessionsRowActions session={row.original} />,
      enableHiding: false,
      enableSorting: false,
      id: SESSION_TABLE_COLUMN_ID.actions,
      meta: { cellClassName: "pr-4 text-right", headClassName: "pr-4", preventRowClick: true, skeletonVariant: "iconEnd" },
      ...fixedDataGridColumnWidth(SESSION_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const useSessionColumns = () => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const format = useFormatter()
  const locale = useLocale()
  const displayPreferences = useDisplayPreferences()

  return useMemo(
    () =>
      buildSessionColumns({
        format,
        lastActive: (date) => formatSessionLastActive(date, t("activeNow"), { ...displayPreferences, locale }),
        t,
      }),
    [displayPreferences, format, locale, t],
  )
}

interface SessionColumnContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly lastActive: (date: Date) => string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.settings.security.sessions">>
}

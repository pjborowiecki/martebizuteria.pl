import { createColumnHelper } from "@tanstack/react-table"
import { type useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import {
  ACTOR_ROLE_COLORS,
  AUDIT_LOG_TABLE_COLUMN_ID,
  AUDIT_LOG_TABLE_COLUMN_SIZE,
  SEVERITY_BADGE_COLORS,
} from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { toAuditActionMessageKey } from "~/src/modules/audit-log/audit-log.utils"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { AuditActorCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-actor-cell"
import { AuditDetailCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-detail-cell"
import { AuditTableCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-table-cell"
import { AuditTargetCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-target-cell"
import { AuditRowActions } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-row-actions"
import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

const resolveAuditActionLabel = (t: BuildAuditColumnsOptions["t"], action: string): string => {
  const messageKey = toAuditActionMessageKey(action)

  return t.has(messageKey) ? t(messageKey) : action
}

export const buildAuditColumns = ({ selectionLabels, t }: BuildAuditColumnsOptions) =>
  columnHelper.columns([
    selectionColumn(columnHelper, selectionLabels),
    columnHelper.accessor("severity", {
      cell: ({ getValue }) => {
        const severity = getValue()

        return (
          <AuditTableCell>
            <Badge className={`border-0 text-[10px] ${SEVERITY_BADGE_COLORS[severity]}`} variant="secondary">
              {t(`audit.severity.${severity}`)}
            </Badge>
          </AuditTableCell>
        )
      },
      header: t("audit.columns.status"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.severity,
      meta: {
        skeletonVariant: "badge",
      },
      minSize: AUDIT_LOG_TABLE_COLUMN_SIZE.severity,
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.severity,
    }),
    columnHelper.accessor("action", {
      cell: ({ getValue }) => (
        <AuditTableCell>
          <span className="truncate text-xs font-medium">{resolveAuditActionLabel(t, getValue())}</span>
        </AuditTableCell>
      ),
      header: t("audit.columns.event"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.action,
      meta: {
        skeletonVariant: "text",
      },
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.action,
    }),
    columnHelper.accessor("target", {
      cell: ({ row }) => <AuditTargetCell resourceId={row.original.resourceId} target={row.original.target} />,
      header: t("audit.columns.target"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.target,
      meta: {
        fillsRemainingWidth: true,
        skeletonVariant: "recordId",
      },
      minSize: AUDIT_LOG_TABLE_COLUMN_SIZE.targetMin,
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.target,
    }),
    columnHelper.accessor("detail", {
      cell: ({ getValue }) => <AuditDetailCell detail={getValue()} />,
      header: t("audit.columns.detail"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.detail,
      meta: {
        skeletonVariant: "text",
      },
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.detail,
    }),
    columnHelper.accessor("category", {
      cell: ({ getValue }) => (
        <AuditTableCell>
          <Badge className="border-0 text-[10px]" variant="secondary">
            {t(`audit.categories.${getValue()}`)}
          </Badge>
        </AuditTableCell>
      ),
      header: t("audit.columns.category"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.category,
      meta: {
        skeletonVariant: "badge",
      },
      minSize: AUDIT_LOG_TABLE_COLUMN_SIZE.category,
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.category,
    }),
    columnHelper.display({
      cell: ({ row }) => (
        <AuditActorCell
          initials={row.original.actor.initials}
          name={row.original.actor.name}
          roleColor={ACTOR_ROLE_COLORS[row.original.actor.role]}
        />
      ),
      header: t("audit.columns.actor"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.actor,
      meta: {
        skeletonVariant: "text",
      },
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.actor,
    }),
    columnHelper.accessor("ip", {
      cell: ({ getValue }) => {
        const ip = getValue()

        return (
          <AuditTableCell>
            {ip === undefined ? (
              <span className={IP_TEXT_CLASS}>{EMPTY_VALUE}</span>
            ) : (
              <CatalogTruncatedTextCell className={IP_TEXT_CLASS} text={ip} />
            )}
          </AuditTableCell>
        )
      },
      header: t("audit.columns.ip"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.ip,
      meta: {
        skeletonVariant: "text",
      },
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.ip,
    }),
    columnHelper.accessor("timestamp", {
      cell: ({ getValue }) => (
        <AuditTableCell>
          <span className="font-mono text-[11px] text-muted-foreground/60">{getValue()}</span>
        </AuditTableCell>
      ),
      header: t("audit.columns.timestamp"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.timestamp,
      maxSize: AUDIT_LOG_TABLE_COLUMN_SIZE.timestampMax,
      meta: {
        skeletonVariant: "date",
      },
      minSize: AUDIT_LOG_TABLE_COLUMN_SIZE.timestamp,
      size: AUDIT_LOG_TABLE_COLUMN_SIZE.timestamp,
    }),
    columnHelper.display({
      cell: ({ row }) => <AuditRowActions entry={row.original} eventLabel={resolveAuditActionLabel(t, row.original.action)} />,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("audit.columns.actions")}</span>,
      id: AUDIT_LOG_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(AUDIT_LOG_TABLE_COLUMN_SIZE.actions),
    }),
  ])

const columnHelper = createColumnHelper<DataGridFeatures, AuditLog["adminListItem"]>()

const IP_TEXT_CLASS = "font-mono text-[10px] text-muted-foreground/40"

interface BuildAuditColumnsOptions {
  readonly selectionLabels: {
    readonly all: string
    readonly row: string
  }
  readonly t: ReturnType<typeof useTranslations<"pages.admin">>
}

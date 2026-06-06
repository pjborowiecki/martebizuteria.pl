import { createColumnHelper } from "@tanstack/react-table";
import type { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";

import { AuditActorCell } from "~/src/components/custom/pages/admin/audit/audit-table/audit-actor-cell";

import { ACTOR_ROLE_COLORS, AUDIT_LOG_TABLE_COLUMN_ID, SEVERITY_BADGE_COLORS } from "~/src/modules/audit-log/audit-log.constants";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";

const ACTION_DOT_REGEX = /\./gu;
const EMPTY_VALUE = "—";

const columnHelper = createColumnHelper<AuditLog["adminListItem"]>();

interface BuildAuditColumnsOptions {
  readonly t: ReturnType<typeof useTranslations<"pages.admin">>;
}

export function buildAuditColumns({ t }: BuildAuditColumnsOptions) {
  return [
    columnHelper.accessor("severity", {
      cell: ({ getValue }) => {
        const severity = getValue();
        return (
          <Badge className={`border-0 text-[10px] ${SEVERITY_BADGE_COLORS[severity]}`} variant="secondary">
            {t(`audit.severity.${severity}`)}
          </Badge>
        );
      },
      header: t("audit.columns.status"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.severity,
      size: 90
    }),
    columnHelper.accessor("action", {
      cell: ({ getValue }) => {
        const actionKey = getValue().replace(ACTION_DOT_REGEX, "_");
        return <span className="truncate text-xs font-medium">{t(`audit.actions.${actionKey}`)}</span>;
      },
      header: t("audit.columns.event"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.action,
      size: 160
    }),
    columnHelper.accessor("target", {
      cell: ({ getValue }) => <span className="truncate font-mono text-[11px] text-muted-foreground/50">{getValue()}</span>,
      header: t("audit.columns.target"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.target,
      size: 120
    }),
    columnHelper.accessor("detail", {
      cell: ({ getValue }) => <span className="max-w-0 truncate text-xs text-muted-foreground">{getValue() ?? EMPTY_VALUE}</span>,
      header: t("audit.columns.detail"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.detail,
      size: 280
    }),
    columnHelper.accessor("category", {
      cell: ({ getValue }) => (
        <Badge className="border-0 text-[10px]" variant="secondary">
          {t(`audit.categories.${getValue()}`)}
        </Badge>
      ),
      header: t("audit.columns.category"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.category,
      size: 100
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
      size: 140
    }),
    columnHelper.accessor("timestamp", {
      cell: ({ getValue }) => <span className="font-mono text-[11px] text-muted-foreground/60">{getValue()}</span>,
      header: t("audit.columns.timestamp"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.timestamp,
      size: 170
    }),
    columnHelper.accessor("ip", {
      cell: ({ getValue }) => <span className="font-mono text-[10px] text-muted-foreground/40">{getValue() ?? EMPTY_VALUE}</span>,
      header: t("audit.columns.ip"),
      id: AUDIT_LOG_TABLE_COLUMN_ID.ip,
      size: 110
    })
  ];
}

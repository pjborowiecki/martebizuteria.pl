import { useMemo } from "react"

import { useTranslations } from "use-intl/react"
import type * as zod from "zod"

import { LIST_PAGE_FIRST, LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { type auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"
import { exportAuditLogs } from "~/src/modules/audit-log/use-cases/export-audit-logs"

import {
  type DataGridExportSource,
  describeDateFilter,
  exportFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { useAuditDateTimeLabel } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-datetime-filter"

export const AUDIT_LOG_EXPORT_LIST = "audit-log"

const loadAuditLogPages = async (input: AuditExportInput, page: number, until?: number): Promise<AuditLog["adminListItem"][]> => {
  const result = await exportAuditLogs({ data: { ...input, page, until } })

  return result.hasMore ? [...result.items, ...(await loadAuditLogPages(input, page + LIST_PAGE_STEP, result.until))] : result.items
}

export const useAuditExportSource = (input: AuditExportInput): DataGridExportSource<AuditLog["adminListItem"]> => {
  const t = useTranslations("pages.admin")
  const tGrid = useTranslations("components.datagrid")
  const formatDateTimeLabel = useAuditDateTimeLabel()

  return useMemo(
    () => ({
      filters: [
        ...exportFilter(t("audit.columns.category"), input.category === undefined ? undefined : t(`audit.categories.${input.category}`)),
        ...exportFilter(t("audit.columns.status"), input.severity === undefined ? undefined : t(`audit.severity.${input.severity}`)),
        ...exportFilter(
          t("audit.columns.timestamp"),
          input.createdAt === undefined ? undefined : describeDateFilter(input.createdAt, formatDateTimeLabel, tGrid),
        ),
      ],
      list: AUDIT_LOG_EXPORT_LIST,
      loadRows: () => loadAuditLogPages(input, LIST_PAGE_FIRST),
      search: input.search,
      title: t("audit.title"),
    }),
    [formatDateTimeLabel, input, t, tGrid],
  )
}

type AuditExportInput = Omit<zod.input<typeof auditLogZodSchemas.adminAuditLogsExportInput>, "page" | "until">

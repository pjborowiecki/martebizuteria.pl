import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { buildAuditLogDayFilter } from "~/src/modules/audit-log/audit-log.utils"

import { type AuditStatCardConfig } from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"

export interface AuditStatCardFilters {
  readonly createdAt: DateTimeColumnFilterValue | undefined
  readonly severity: AuditLogSeverity | undefined
}

export const ALL_AUDIT_EVENTS_FILTERS: AuditStatCardFilters = { createdAt: undefined, severity: undefined }

export const buildAuditStatCardFilters = (config: AuditStatCardConfig, today: string): AuditStatCardFilters => ({
  createdAt: config.key === "today" ? buildAuditLogDayFilter(today) : undefined,
  severity: config.filterSeverity,
})

export const isAuditStatCardFilterActive = (card: AuditStatCardFilters, active: AuditStatCardFilters): boolean =>
  card.severity === active.severity &&
  card.createdAt?.operator === active.createdAt?.operator &&
  card.createdAt?.date === active.createdAt?.date

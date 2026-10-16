import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { type AdminAuditLogsFilterParams } from "~/src/modules/audit-log/audit-log.accessors"

export const buildAdminAuditLogsFilterParams = (
  input: Pick<AdminAuditLogsFilterParams, "category" | "createdAt" | "search" | "severity">,
  timeZone: string,
): AdminAuditLogsFilterParams => ({
  category: input.category,
  createdAt: input.createdAt,
  search: normalizeAdminSearchTerm(input.search),
  severity: input.severity,
  timeZone,
})

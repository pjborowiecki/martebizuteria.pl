import zod from "zod/v4"

import { dateTimeColumnFilterField, idField, pageField, pageSizeField } from "~/src/modules/_core/utils/zod-fields"
import { AUDIT_LOG_CATEGORIES, AUDIT_LOG_SEVERITIES } from "~/src/modules/audit-log/audit-log.constants"

export const auditLogZodSchemas = {
  adminAuditLogsPageInput: zod.object({
    category: zod.enum(AUDIT_LOG_CATEGORIES).optional(),
    createdAt: dateTimeColumnFilterField.optional(),
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: zod.string().optional(),
    severity: zod.enum(AUDIT_LOG_SEVERITIES).optional(),
  }),
  deleteAuditLogsInput: zod.array(idField),
}

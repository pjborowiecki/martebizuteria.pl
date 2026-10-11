import zod from "zod/v4"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { dateTimeColumnFilterField, pageField, pageSizeField, uuidField } from "~/src/modules/_core/utils/zod-fields"
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
  deleteAuditLogsInput: zod.array(uuidField).max(LIST_PAGE_SIZE_MAX),
}

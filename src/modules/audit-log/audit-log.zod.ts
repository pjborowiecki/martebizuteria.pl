import zod from "zod/v4"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { dateTimeColumnFilterField, pageField, pageSizeField, uuidField } from "~/src/modules/_core/utils/zod-fields"
import { AUDIT_EMAIL_KIND, AUDIT_LOG_CATEGORIES, AUDIT_LOG_SEVERITIES } from "~/src/modules/audit-log/audit-log.constants"

const emailKind = zod.enum(AUDIT_EMAIL_KIND)

const count = zod.number().int().nonnegative()

export const auditLogZodSchemas = {
  adminAuditLogStatsInput: zod.object({ today: zod.iso.date() }),
  adminAuditLogsPageInput: zod.object({
    category: zod.enum(AUDIT_LOG_CATEGORIES).optional(),
    createdAt: dateTimeColumnFilterField.optional(),
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: zod.string().optional(),
    severity: zod.enum(AUDIT_LOG_SEVERITIES).optional(),
  }),
  cartAbandonedMetadata: zod.object({ itemCount: count }),
  changeMetadata: zod.object({
    changed: zod.array(zod.string()),
    new: zod.record(zod.string(), zod.unknown()),
    old: zod.record(zod.string(), zod.unknown()),
  }),
  deleteAuditLogsInput: zod.array(uuidField).max(LIST_PAGE_SIZE_MAX),
  emailKind,
  emailMetadata: zod.object({
    dailyLimit: count.optional(),
    emailKind: emailKind.optional(),
    idempotencyKey: zod.string().optional(),
  }),
  newsletterSentMetadata: zod.object({ recipientCount: count }),
  variantSnapshots: zod.array(zod.object({ price: zod.number(), quantity: zod.number(), sku: zod.string() })),
}

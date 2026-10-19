import zod from "zod/v4"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { dateTimeColumnFilterField, pageField, pageSizeField, searchTermField, uuidField } from "~/src/modules/_core/utils/zod-fields"
import {
  AUDIT_EMAIL_KIND,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_SEVERITIES,
  CUSTOMER_ACCOUNT_LOGIN_STATUSES,
  CUSTOMER_EMAIL_CHANGE_REFUSAL,
} from "~/src/modules/audit-log/audit-log.constants"

const emailKind = zod.enum(AUDIT_EMAIL_KIND)

const count = zod.number().int().nonnegative()

const stripeKeyedAuditLogId = zod.templateLiteral([
  zod.enum([AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED, AUDIT_LOG_ACTION.ORDER_REFUND_FAILED]),
  ":",
  zod.string().regex(/^\w{1,255}$/u),
])

const adminAuditLogsFilters = zod.object({
  category: zod.enum(AUDIT_LOG_CATEGORIES).optional(),
  createdAt: dateTimeColumnFilterField.optional(),
  search: zod.string().optional(),
  severity: zod.enum(AUDIT_LOG_SEVERITIES).optional(),
})

export const auditLogZodSchemas = {
  adminAuditLogStatsInput: zod.object({ today: zod.iso.date() }),
  adminAuditLogsExportInput: adminAuditLogsFilters.extend({
    page: pageField.optional(),
    until: zod.number().int().positive().optional(),
  }),
  adminAuditLogsPageInput: adminAuditLogsFilters.extend({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
  }),
  cartAbandonedMetadata: zod.object({ itemCount: count }),
  changeMetadata: zod.object({
    changed: zod.array(zod.string()),
    new: zod.record(zod.string(), zod.unknown()),
    old: zod.record(zod.string(), zod.unknown()),
  }),
  customerEmailChangeMetadata: zod.object({
    newEmail: zod.string(),
    orderNumber: zod.string(),
    refusal: zod.enum(CUSTOMER_EMAIL_CHANGE_REFUSAL).optional(),
  }),
  customerLoginHistoryPageInput: zod.object({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: searchTermField.optional(),
    status: zod.enum(CUSTOMER_ACCOUNT_LOGIN_STATUSES).optional(),
  }),
  deleteAuditLogsInput: zod.array(zod.union([uuidField, stripeKeyedAuditLogId])).max(LIST_PAGE_SIZE_MAX),
  emailKind,
  emailMetadata: zod.object({
    dailyLimit: count.optional(),
    emailKind: emailKind.optional(),
    idempotencyKey: zod.string().optional(),
  }),
  newsletterSentMetadata: zod.object({ recipientCount: count }),
  ordersClaimedMetadata: zod.object({ orderCount: count }),
  variantSnapshots: zod.array(zod.object({ price: zod.number(), quantity: zod.number(), sku: zod.string() })),
}

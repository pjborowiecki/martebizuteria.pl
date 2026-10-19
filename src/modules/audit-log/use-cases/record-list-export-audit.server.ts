import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AccountAuditEvent, type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import { scheduleAuditLogFromRequest } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

const LIST_EXPORT_AUDIT_EVENTS = {
  auditLogs: { action: AUDIT_LOG_ACTION.AUDIT_LOG_EXPORTED, category: "settings" },
  customers: { action: AUDIT_LOG_ACTION.CUSTOMER_LIST_EXPORTED, category: "customers" },
  newsletterSubscribers: { action: AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_LIST_EXPORTED, category: "email" },
  orders: { action: AUDIT_LOG_ACTION.ORDER_LIST_EXPORTED, category: "orders" },
  products: { action: AUDIT_LOG_ACTION.PRODUCT_LIST_EXPORTED, category: "catalog" },
} as const satisfies Record<string, Pick<AccountAuditEvent, "action" | "category">>

export const recordListExportedAudit = (
  list: keyof typeof LIST_EXPORT_AUDIT_EVENTS,
  rowCount: number,
  options?: Pick<AuditEventOptions, "metadata">,
): void => {
  scheduleAuditLogFromRequest({
    ...LIST_EXPORT_AUDIT_EVENTS[list],
    metadata: options?.metadata,
    severity: "info",
    target: String(rowCount),
  })
}

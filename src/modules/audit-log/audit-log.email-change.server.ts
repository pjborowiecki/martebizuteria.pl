import type { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, scheduleAccountAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.record.server"

export const recordCustomerEmailChangeAudit = (
  action: typeof AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED | typeof AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  scheduleAccountAudit({ action, category: "customers", severity: "warning" }, account, options)
}

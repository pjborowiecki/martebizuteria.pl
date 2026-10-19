import { type AccountAuditEvent, type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import { resolveActorAuditTarget } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAuditLog } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const scheduleAccountAudit = (
  { action, category, severity }: AccountAuditEvent,
  account: AuditLogActorInput,
  options?: AuditEventOptions,
): void => {
  scheduleAuditLog({
    action,
    actor: options?.actor ?? account,
    category,
    ip: options?.ip,
    severity,
    ...resolveActorAuditTarget(account, options),
  })
}

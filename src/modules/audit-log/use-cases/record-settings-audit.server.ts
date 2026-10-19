import { AUDIT_LOG_ACTION, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import { withResourceId } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAccountAudit } from "~/src/modules/audit-log/use-cases/schedule-account-audit.server"
import { scheduleAuditLogFromRequest } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const recordContentPageUpdatedAudit = (handle: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CONTENT_PAGE_UPDATED,
    category: "content",
    severity: "info",
    ...withResourceId(handle, options),
  })
}

export const recordDiscountCreatedAudit = (code: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.DISCOUNT_CREATED,
    category: "settings",
    severity: "info",
    ...withResourceId(code, options),
  })
}

export const recordDiscountUpdatedAudit = (code: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.DISCOUNT_UPDATED,
    category: "settings",
    severity: "info",
    ...withResourceId(code, options),
  })
}

export const recordDiscountDeletedAudit = (code: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.DISCOUNT_DELETED,
    category: "settings",
    severity: "warning",
    ...withResourceId(code, options),
  })
}

const DELIVERY_METHOD_AUDIT_SEVERITY = {
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_ARCHIVED]: "warning",
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_CREATED]: "info",
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_REORDERED]: "info",
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_RESTORED]: "info",
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_UPDATED]: "info",
} as const satisfies Record<string, AuditLogSeverity>

export const recordDeliveryMethodAudit = (
  action: keyof typeof DELIVERY_METHOD_AUDIT_SEVERITY,
  target: string,
  options?: AuditEventOptions,
): void => {
  scheduleAuditLogFromRequest({
    action,
    category: "settings",
    severity: DELIVERY_METHOD_AUDIT_SEVERITY[action],
    ...withResourceId(target, options),
  })
}

export const recordSettingsUpdatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.SETTINGS_UPDATED,
    category: "settings",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordSalesPausedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.SALES_PAUSED,
    category: "settings",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordSalesResumedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.SALES_RESUMED,
    category: "settings",
    severity: "success",
    ...withResourceId(target, options),
  })
}

export const recordAuditLogsDeletedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.AUDIT_LOG_DELETED,
    category: "settings",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordTeamAccessAudit = (
  action: typeof AUDIT_LOG_ACTION.TEAM_ADMIN_GRANTED | typeof AUDIT_LOG_ACTION.TEAM_ADMIN_REVOKED,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  scheduleAccountAudit({ action, category: "settings", severity: "warning" }, account, options)
}

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import { resolveActorAuditTarget } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAccountAudit } from "~/src/modules/audit-log/use-cases/schedule-account-audit.server"
import { scheduleAuditLog, scheduleSystemAuditLog } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const recordAuthPasswordChangedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_PASSWORD_CHANGED, category: "auth", severity: "info" }, account, options)
}

export const recordAuthPasswordResetAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_PASSWORD_RESET, category: "auth", severity: "warning" }, account, options)
}

export const recordAuthEmailChangedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_EMAIL_CHANGED, category: "auth", severity: "warning" }, account, options)
}

export const recordAuthEmailVerifiedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_EMAIL_VERIFIED, category: "auth", severity: "success" }, account, options)
}

export const recordAuthTwoFactorEnabledAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_TWO_FACTOR_ENABLED, category: "auth", severity: "success" }, account, options)
}

export const recordAuthTwoFactorDisabledAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_TWO_FACTOR_DISABLED, category: "auth", severity: "warning" }, account, options)
}

export const recordAuthSessionsRevokedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_SESSIONS_REVOKED, category: "auth", severity: "info" }, account, options)
}

export const recordAuthUserBannedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_USER_BANNED, category: "auth", severity: "warning" }, account, options)
}

export const recordAuthUserUnbannedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.AUTH_USER_UNBANNED, category: "auth", severity: "info" }, account, options)
}

export const recordAuthLoginAudit = (actor: AuditLogActorInput, options?: AuditEventOptions): void => {
  const targetFields = resolveActorAuditTarget(actor, options)

  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGIN,
    actor,
    category: "auth",
    ip: options?.ip,
    severity: "info",
    ...targetFields,
  })
}

export const recordAuthLoginFailedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
    category: "auth",
    detail: options?.detail ?? target,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId,
    severity: "warning",
    target,
  })
}

export const recordAuthLogoutAudit = (actor: AuditLogActorInput, options?: AuditEventOptions): void => {
  const targetFields = resolveActorAuditTarget(actor, options)

  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGOUT,
    actor,
    category: "auth",
    ip: options?.ip,
    severity: "info",
    ...targetFields,
  })
}

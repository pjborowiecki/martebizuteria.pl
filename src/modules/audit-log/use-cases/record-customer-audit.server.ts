import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import { resolveActorAuditTarget, withResourceId } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAccountAudit } from "~/src/modules/audit-log/use-cases/schedule-account-audit.server"
import {
  scheduleAuditLog,
  scheduleAuditLogFromRequest,
  scheduleSystemAuditLog,
} from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const recordCustomerRegisteredAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_REGISTERED,
    category: "customers",
    severity: "success",
    ...withResourceId(target, {
      ...options,
      metadata: { ...options?.metadata, email: target },
    }),
  })
}

export const recordCustomerDeletionFailedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED,
    category: "customers",
    severity: "error",
    ...withResourceId(email, options),
  })
}

export const recordCustomerUpdatedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CUSTOMER_UPDATED,
    category: "customers",
    severity: "info",
    ...withResourceId(email, options),
  })
}

export const recordCustomerOrdersClaimedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_ORDERS_CLAIMED,
    category: "customers",
    severity: "info",
    ...withResourceId(email, options),
  })
}

export const recordCustomerDeletedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.CUSTOMER_DELETED, category: "customers", severity: "warning" }, account, options)
}

export const recordCustomerStripeEmailFailedAudit = (account: AuditLogActorInput, options: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_STRIPE_EMAIL_FAILED,
    category: "customers",
    ip: options.ip,
    severity: "warning",
    ...resolveActorAuditTarget(account, options),
  })
}

export const recordCustomerCartItemAddedAudit = (actor: AuditLogActorInput, options?: AuditEventOptions): void => {
  const targetFields = resolveActorAuditTarget(actor, options)

  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
    actor,
    category: "customers",
    ip: options?.ip,
    severity: "info",
    ...targetFields,
  })
}

export const recordCustomerCartAbandonedAudit = (actor: AuditLogActorInput, options?: AuditEventOptions): void => {
  const targetFields = resolveActorAuditTarget(actor, options)

  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED,
    actor,
    category: "customers",
    ip: options?.ip,
    severity: "warning",
    ...targetFields,
    detail: options?.detail,
  })
}

export const recordCustomerPageViewedAudit = (actor: AuditLogActorInput, options?: AuditEventOptions): void => {
  const targetFields = resolveActorAuditTarget(actor, options)

  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED,
    actor,
    category: "customers",
    ip: options?.ip,
    severity: "info",
    ...targetFields,
  })
}

export const recordCustomerEmailChangeAudit = (
  action: typeof AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED | typeof AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  scheduleAccountAudit({ action, category: "customers", severity: "warning" }, account, options)
}

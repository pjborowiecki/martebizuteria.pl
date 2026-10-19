import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import { withResourceId } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAuditLogFromRequest, scheduleSystemAuditLog } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const recordNewsletterSentAudit = (subject: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.NEWSLETTER_SENT,
    category: "email",
    severity: "info",
    ...withResourceId(subject, options),
  })
}

export const recordNewsletterSubscriberUnsubscribedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_UNSUBSCRIBED,
    category: "email",
    severity: "info",
    ...withResourceId(email, options),
  })
}

export const recordNewsletterSubscriberConfirmedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_CONFIRMED,
    category: "email",
    severity: "success",
    ...withResourceId(email, options),
  })
}

export const recordNewsletterSubscriberErasedAudit = (email: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_ERASED,
    category: "email",
    severity: "warning",
    ...withResourceId(email, options),
  })
}

export const recordEmailSentAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.EMAIL_SENT,
    category: "email",
    severity: "success",
    ...withResourceId(target, options),
  })
}

export const recordEmailFailedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.EMAIL_FAILED,
    category: "email",
    severity: "error",
    ...withResourceId(target, options),
  })
}

export const recordEmailDeferredAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.EMAIL_DEFERRED,
    category: "email",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordEmailResendRequestedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.EMAIL_RESEND_REQUESTED,
    category: "email",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderEmailOutcome = ({ failure, label, metadata, orderId, willRetry }: Readonly<OrderEmailOutcomeRecord>): void => {
  if (failure === undefined) {
    recordEmailSentAudit(orderId, { detail: label, metadata, resourceId: orderId })

    return
  }
  console.error(`${label} failed for order ${orderId}: ${failure}`)
  const options = { detail: `${label} — ${failure}`, metadata, resourceId: orderId }
  if (willRetry) {
    recordEmailDeferredAudit(orderId, options)

    return
  }
  recordEmailFailedAudit(orderId, options)
}

interface OrderEmailOutcomeRecord {
  readonly failure: string | undefined
  readonly label: string
  readonly metadata: Record<string, unknown>
  readonly orderId: string
  readonly willRetry: boolean
}

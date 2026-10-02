import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  type AuditLogActorInput,
  scheduleAuditLog,
  scheduleAuditLogFromRequest,
  scheduleSystemAuditLog,
} from "~/src/modules/audit-log/audit-log.record.server"

export interface AuditEventOptions {
  readonly actor?: AuditLogActorInput | undefined
  readonly detail?: string | undefined
  readonly ip?: string | undefined
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId?: string | undefined
}

const withResourceId = (
  target: string,
  options?: AuditEventOptions,
): { target: string; detail?: string | undefined; metadata?: Record<string, unknown> | undefined; resourceId?: string | undefined } => ({
  detail: options?.detail,
  metadata: options?.metadata,
  resourceId: options?.resourceId ?? target,
  target,
})

const resolveActorAuditTarget = (
  actor: AuditLogActorInput,
  options?: AuditEventOptions,
): { detail?: string | undefined; metadata?: Record<string, unknown> | undefined; resourceId?: string | undefined; target: string } => {
  const resourceId = options?.resourceId ?? actor.id
  const email = actor.email?.trim()

  if (email !== undefined && email !== "") {
    return {
      detail: options?.detail ?? actor.name,
      metadata: { ...options?.metadata, email },
      resourceId,
      target: email,
    }
  }

  return {
    detail: options?.detail,
    metadata: options?.metadata,
    resourceId,
    target: actor.name,
  }
}

export const recordCatalogProductCreatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogProductUpdatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogProductDeletedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCategoryCreatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCategoryUpdatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCategoryDeletedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCollectionCreatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCollectionUpdatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogCollectionDeletedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options),
  })
}

export const recordCatalogAttributeCreatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogAttributeUpdatedAudit = (target: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options),
  })
}

export const recordCatalogAttributeDeletedAudit = (target: string, options?: AuditEventOptions): void => {
  const payload = withResourceId(target, options)

  if (options?.actor !== undefined) {
    scheduleAuditLog({
      action: AUDIT_LOG_ACTION.ATTRIBUTE_DELETED,
      actor: options.actor,
      category: "catalog",
      detail: payload.detail,
      ip: options.ip,
      metadata: payload.metadata,
      resourceId: payload.resourceId,
      severity: "warning",
      target: payload.target,
    })

    return
  }

  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_DELETED,
    category: "catalog",
    severity: "warning",
    ...payload,
  })
}

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

export const recordDiscountRedeemedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.DISCOUNT_REDEEMED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

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

export const recordOrderPlacedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PLACED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderPaymentCapturedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_CAPTURED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderFulfillmentStartedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderShippedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderCancelledAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_CANCELLED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRefundAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_INITIATED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderReleasedAudit = (sessionId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_RELEASED,
    category: "orders",
    severity: "info",
    ...withResourceId(sessionId, options),
  })
}

export const recordOrderPaymentFailedAudit = (paymentIntentId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_FAILED,
    category: "orders",
    severity: "error",
    ...withResourceId(paymentIntentId, options),
  })
}

export const recordOrderDisputeOpenedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderDisputeClosedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
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

export const recordOrderEmailOutcome = ({
  failure,
  label,
  orderId,
}: Readonly<{ failure: string | undefined; label: string; orderId: string }>): void => {
  if (failure === undefined) {
    recordEmailSentAudit(orderId, { detail: label, resourceId: orderId })

    return
  }
  console.error(`${label} failed for order ${orderId}: ${failure}`)
  recordEmailFailedAudit(orderId, { detail: `${label} — ${failure}`, resourceId: orderId })
}

export const resolveAuthAuditActor = (
  user: Readonly<{ email: string; id: string; name: string; role?: string | null | undefined }>,
): AuditLogActorInput => {
  let actorRole: AuditLogActorInput["role"] = "unknown"

  if (user.role === ROLES.ADMIN) {
    actorRole = "admin"
  } else if (user.role === ROLES.CUSTOMER) {
    actorRole = "customer"
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: actorRole,
  }
}

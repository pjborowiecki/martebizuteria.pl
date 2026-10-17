import { ROLES } from "~/src/integrations/better-auth/auth.access"

import {
  AUDIT_LOG_ACTION,
  type AuditLogAction,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"
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

interface AccountAuditEvent {
  readonly action: AuditLogAction
  readonly category: AuditLogCategory
  readonly severity: AuditLogSeverity
}

const scheduleAccountAudit = (
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

export const recordImageUploadedAudit = (key: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.IMAGE_UPLOADED,
    category: "catalog",
    severity: "info",
    ...withResourceId(key, options),
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

export const recordCustomerDeletedAudit = (account: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAccountAudit({ action: AUDIT_LOG_ACTION.CUSTOMER_DELETED, category: "customers", severity: "warning" }, account, options)
}

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

export const recordTeamAccessAudit = (
  action: typeof AUDIT_LOG_ACTION.TEAM_ADMIN_GRANTED | typeof AUDIT_LOG_ACTION.TEAM_ADMIN_REVOKED,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  scheduleAccountAudit({ action, category: "settings", severity: "warning" }, account, options)
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
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderShippedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderCancelledAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
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

export const recordOrderRefundFailedAudit = (orderId: string, refundId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_FAILED,
    category: "orders",
    id: `${AUDIT_LOG_ACTION.ORDER_REFUND_FAILED}:${refundId}`,
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRefundRequestedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_REQUESTED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRestockedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_RESTOCKED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderWithdrawalReceivedAudit = (orderId: string, consumer: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_WITHDRAWAL_RECEIVED,
    actor: consumer,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderShipmentCreatedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_SHIPMENT_CREATED,
    category: "orders",
    severity: "info",
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

export const recordOrderDeliveredAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_DELIVERED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderSteppedBackAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_STEPPED_BACK,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderTrackingUpdatedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_TRACKING_UPDATED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
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

export const recordOrderFulfillmentFailedAudit = (sessionId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED,
    category: "orders",
    id: `${AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED}:${sessionId}`,
    severity: "error",
    ...withResourceId(sessionId, options),
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

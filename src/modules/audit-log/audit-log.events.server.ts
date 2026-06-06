import { ROLES } from "~/src/constants/_constants/permissions";

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants";
import {
  scheduleAuditLog,
  scheduleAuditLogFromRequest,
  scheduleSystemAuditLog,
  type AuditLogActorInput
} from "~/src/modules/audit-log/audit-log.record.server";

export interface AuditEventOptions {
  readonly detail?: string;
  readonly metadata?: Record<string, unknown>;
  readonly resourceId?: string;
}

function withResourceId(
  target: string,
  options?: AuditEventOptions
): { target: string; detail?: string; metadata?: Record<string, unknown>; resourceId?: string } {
  return {
    detail: options?.detail,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? target,
    target
  };
}

export function recordCatalogProductCreatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogProductUpdatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogProductDeletedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.PRODUCT_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCategoryCreatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCategoryUpdatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCategoryDeletedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.CATEGORY_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCollectionCreatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCollectionUpdatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogCollectionDeletedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.COLLECTION_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options)
  });
}

export function recordCatalogAttributeCreatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_CREATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogAttributeUpdatedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_UPDATED,
    category: "catalog",
    severity: "info",
    ...withResourceId(target, options)
  });
}

export function recordCatalogAttributeDeletedAudit(target: string, options?: AuditEventOptions): void {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ATTRIBUTE_DELETED,
    category: "catalog",
    severity: "warning",
    ...withResourceId(target, options)
  });
}

export function recordCustomerRegisteredAudit(target: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_REGISTERED,
    category: "customers",
    severity: "success",
    ...withResourceId(target, options)
  });
}

export function recordAuthLoginAudit(actor: AuditLogActorInput, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGIN,
    actor,
    category: "auth",
    detail: options?.detail,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? actor.id,
    severity: "info",
    target: actor.name
  });
}

export function recordAuthLoginFailedAudit(target: string, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
    category: "auth",
    detail: options?.detail ?? target,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId,
    severity: "warning",
    target
  });
}

export function recordAuthLogoutAudit(actor: AuditLogActorInput, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.AUTH_LOGOUT,
    actor,
    category: "auth",
    detail: options?.detail,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? actor.id,
    severity: "info",
    target: actor.name
  });
}

export function recordCustomerCartItemAddedAudit(actor: AuditLogActorInput, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
    actor,
    category: "customers",
    detail: options?.detail,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? actor.id,
    severity: "info",
    target: actor.name
  });
}

export function recordCustomerCartAbandonedAudit(actor: AuditLogActorInput, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED,
    actor,
    category: "customers",
    detail: options?.detail,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? actor.id,
    severity: "warning",
    target: actor.name
  });
}

export function recordCustomerPageViewedAudit(actor: AuditLogActorInput, options?: AuditEventOptions & { readonly ip?: string }): void {
  scheduleAuditLog({
    action: AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED,
    actor,
    category: "customers",
    detail: options?.detail,
    ip: options?.ip,
    metadata: options?.metadata,
    resourceId: options?.resourceId ?? actor.id,
    severity: "info",
    target: actor.name
  });
}

export function recordOrderPlacedAudit(orderId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PLACED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options)
  });
}

export function recordOrderPaymentCapturedAudit(orderId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_CAPTURED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options)
  });
}

export function recordOrderRefundAudit(orderId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_INITIATED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options)
  });
}

export function recordOrderReleasedAudit(sessionId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_RELEASED,
    category: "orders",
    severity: "info",
    ...withResourceId(sessionId, options)
  });
}

export function recordOrderPaymentFailedAudit(paymentIntentId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_FAILED,
    category: "orders",
    severity: "error",
    ...withResourceId(paymentIntentId, options)
  });
}

export function recordOrderDisputeOpenedAudit(orderId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options)
  });
}

export function recordOrderDisputeClosedAudit(orderId: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options)
  });
}

export function recordEmailSentAudit(target: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.EMAIL_SENT,
    category: "email",
    severity: "success",
    ...withResourceId(target, options)
  });
}

export function recordEmailFailedAudit(target: string, options?: AuditEventOptions): void {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.EMAIL_FAILED,
    category: "email",
    severity: "error",
    ...withResourceId(target, options)
  });
}

export function resolveAuthAuditActor(user: Readonly<{ id: string; name: string; role?: string | null }>): AuditLogActorInput {
  let actorRole: AuditLogActorInput["role"] = "unknown";

  if (user.role === ROLES.ADMIN) {
    actorRole = "admin";
  } else if (user.role === ROLES.CUSTOMER) {
    actorRole = "customer";
  }

  return {
    id: user.id,
    name: user.name,
    role: actorRole
  };
}

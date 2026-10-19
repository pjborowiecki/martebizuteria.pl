import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import { withResourceId } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAuditLog, scheduleAuditLogFromRequest } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

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

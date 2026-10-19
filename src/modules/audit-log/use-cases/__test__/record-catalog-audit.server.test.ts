import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import {
  recordCatalogAttributeCreatedAudit,
  recordCatalogAttributeDeletedAudit,
  recordCatalogAttributeUpdatedAudit,
  recordCatalogCategoryCreatedAudit,
  recordCatalogCategoryDeletedAudit,
  recordCatalogCategoryUpdatedAudit,
  recordCatalogCollectionCreatedAudit,
  recordCatalogCollectionDeletedAudit,
  recordCatalogCollectionUpdatedAudit,
  recordCatalogProductCreatedAudit,
  recordCatalogProductDeletedAudit,
  recordCatalogProductUpdatedAudit,
  recordImageUploadedAudit,
} from "~/src/modules/audit-log/use-cases/record-catalog-audit.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/use-cases/schedule-audit-log.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("catalog audit events", () => {
  it("defaults the resource id to the target and keeps optional fields absent", () => {
    recordCatalogProductCreatedAudit("product-1")

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.PRODUCT_CREATED,
      category: "catalog",
      detail: undefined,
      metadata: undefined,
      resourceId: "product-1",
      severity: "info",
      target: "product-1",
    })
  })

  it("keeps an explicit resource id, detail and metadata", () => {
    recordCatalogProductUpdatedAudit("Gold ring", {
      detail: "price changed",
      metadata: { price: 1999 },
      resourceId: "product-42",
    })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.PRODUCT_UPDATED,
      category: "catalog",
      detail: "price changed",
      metadata: { price: 1999 },
      resourceId: "product-42",
      severity: "info",
      target: "Gold ring",
    })
  })

  it("raises the severity to warning for a deletion", () => {
    recordCatalogCategoryDeletedAudit("rings")

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_LOG_ACTION.CATEGORY_DELETED,
        severity: "warning",
      }),
    )
  })
})

describe("recordCatalogAttributeDeletedAudit", () => {
  it("uses the request actor when no actor is supplied", () => {
    recordCatalogAttributeDeletedAudit("material")

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.ATTRIBUTE_DELETED,
      category: "catalog",
      detail: undefined,
      metadata: undefined,
      resourceId: "material",
      severity: "warning",
      target: "material",
    })
  })

  it("schedules directly with the supplied actor and ip", () => {
    recordCatalogAttributeDeletedAudit("material", {
      actor: { email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" },
      detail: "removed by admin",
      ip: "203.0.113.7",
      resourceId: "attribute-9",
    })

    expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.ATTRIBUTE_DELETED,
      actor: { email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" },
      category: "catalog",
      detail: "removed by admin",
      ip: "203.0.113.7",
      metadata: undefined,
      resourceId: "attribute-9",
      severity: "warning",
      target: "material",
    })
  })
})

interface TargetAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (target: string, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

const CATALOG_CASES: readonly TargetAuditCase[] = [
  { action: AUDIT_LOG_ACTION.PRODUCT_DELETED, name: "a deleted product", record: recordCatalogProductDeletedAudit, severity: "warning" },
  { action: AUDIT_LOG_ACTION.CATEGORY_CREATED, name: "a new category", record: recordCatalogCategoryCreatedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.CATEGORY_UPDATED, name: "an edited category", record: recordCatalogCategoryUpdatedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.COLLECTION_CREATED, name: "a new collection", record: recordCatalogCollectionCreatedAudit, severity: "info" },
  {
    action: AUDIT_LOG_ACTION.COLLECTION_UPDATED,
    name: "an edited collection",
    record: recordCatalogCollectionUpdatedAudit,
    severity: "info",
  },
  {
    action: AUDIT_LOG_ACTION.COLLECTION_DELETED,
    name: "a deleted collection",
    record: recordCatalogCollectionDeletedAudit,
    severity: "warning",
  },
  { action: AUDIT_LOG_ACTION.ATTRIBUTE_CREATED, name: "a new attribute", record: recordCatalogAttributeCreatedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.ATTRIBUTE_UPDATED, name: "an edited attribute", record: recordCatalogAttributeUpdatedAudit, severity: "info" },
]

describe("remaining catalog audit events", () => {
  it.each(CATALOG_CASES)("files $name under the catalog category with the request actor", ({ action, record: recordAudit, severity }) => {
    recordAudit("necklaces")

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith({
      action,
      category: "catalog",
      detail: undefined,
      metadata: undefined,
      resourceId: "necklaces",
      severity,
      target: "necklaces",
    })
  })

  it.each(CATALOG_CASES)("keeps the detail, metadata and resource id handed to $name", ({ record: recordAudit }) => {
    recordAudit("necklaces", { detail: "renamed", metadata: { rank: 2 }, resourceId: "category-4" })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "renamed", metadata: { rank: 2 }, resourceId: "category-4", target: "necklaces" }),
    )
  })
})

describe("recordImageUploadedAudit", () => {
  it("files the upload under the catalog against the admin making the request, with the object key as the target", () => {
    recordImageUploadedAudit("products/abc.png", { detail: "ring.png" })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.IMAGE_UPLOADED,
      category: "catalog",
      detail: "ring.png",
      metadata: undefined,
      resourceId: "products/abc.png",
      severity: "info",
      target: "products/abc.png",
    })
  })
})

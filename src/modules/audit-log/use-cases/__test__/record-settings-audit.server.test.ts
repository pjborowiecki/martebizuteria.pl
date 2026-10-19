import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import {
  recordAuditLogsDeletedAudit,
  recordContentPageUpdatedAudit,
  recordDeliveryMethodAudit,
  recordDiscountCreatedAudit,
  recordDiscountDeletedAudit,
  recordDiscountUpdatedAudit,
  recordSalesPausedAudit,
  recordSalesResumedAudit,
  recordSettingsUpdatedAudit,
} from "~/src/modules/audit-log/use-cases/record-settings-audit.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/use-cases/schedule-audit-log.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("recordContentPageUpdatedAudit", () => {
  it("files the edited page under content against the admin making the request", () => {
    recordContentPageUpdatedAudit("privacy-policy")

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.CONTENT_PAGE_UPDATED,
      category: "content",
      detail: undefined,
      metadata: undefined,
      resourceId: "privacy-policy",
      severity: "info",
      target: "privacy-policy",
    })
  })
})

interface TargetAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (target: string, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

const DISCOUNT_ADMIN_CASES: readonly TargetAuditCase[] = [
  { action: AUDIT_LOG_ACTION.DISCOUNT_CREATED, name: "a new discount code", record: recordDiscountCreatedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.DISCOUNT_UPDATED, name: "an edited discount code", record: recordDiscountUpdatedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.DISCOUNT_DELETED, name: "a deleted discount code", record: recordDiscountDeletedAudit, severity: "warning" },
]

describe("discount administration audit events", () => {
  it.each(DISCOUNT_ADMIN_CASES)("files $name under settings against the requesting admin", ({ action, record: recordAudit, severity }) => {
    recordAudit("SPRING")

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action,
      category: "settings",
      detail: undefined,
      metadata: undefined,
      resourceId: "SPRING",
      severity,
      target: "SPRING",
    })
  })

  it.each(DISCOUNT_ADMIN_CASES)("keeps the discount id and detail handed to $name", ({ record: recordAudit }) => {
    recordAudit("SPRING", { detail: "10% off", resourceId: "discount-1" })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "10% off", resourceId: "discount-1", target: "SPRING" }),
    )
  })
})

const SALES_SWITCH_CASES: readonly TargetAuditCase[] = [
  { action: AUDIT_LOG_ACTION.SALES_PAUSED, name: "pausing sales", record: recordSalesPausedAudit, severity: "warning" },
  { action: AUDIT_LOG_ACTION.SALES_RESUMED, name: "resuming sales", record: recordSalesResumedAudit, severity: "success" },
]

describe("sales switch audit events", () => {
  it.each(SALES_SWITCH_CASES)("files $name under settings against the requesting admin", ({ action, record: recordAudit, severity }) => {
    recordAudit("store")

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action,
      category: "settings",
      detail: undefined,
      metadata: undefined,
      resourceId: "store",
      severity,
      target: "store",
    })
  })
})

const DELIVERY_METHOD_CASES = [
  { action: AUDIT_LOG_ACTION.DELIVERY_METHOD_CREATED, severity: "info" },
  { action: AUDIT_LOG_ACTION.DELIVERY_METHOD_UPDATED, severity: "info" },
  { action: AUDIT_LOG_ACTION.DELIVERY_METHOD_ARCHIVED, severity: "warning" },
  { action: AUDIT_LOG_ACTION.DELIVERY_METHOD_RESTORED, severity: "info" },
  { action: AUDIT_LOG_ACTION.DELIVERY_METHOD_REORDERED, severity: "info" },
] as const

describe("recordDeliveryMethodAudit", () => {
  it.each(DELIVERY_METHOD_CASES)("files $action under settings with $severity severity, naming the method", ({ action, severity }) => {
    recordDeliveryMethodAudit(action, "Kurier InPost")

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action,
      category: "settings",
      detail: undefined,
      metadata: undefined,
      resourceId: "Kurier InPost",
      severity,
      target: "Kurier InPost",
    })
  })
})

describe("recordSettingsUpdatedAudit", () => {
  it("files a changed shop setting under settings, with what changed", () => {
    recordSettingsUpdatedAudit("free-delivery", { metadata: { changed: ["freeDeliveryThreshold"] } })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.SETTINGS_UPDATED,
      category: "settings",
      detail: undefined,
      metadata: { changed: ["freeDeliveryThreshold"] },
      resourceId: "free-delivery",
      severity: "info",
      target: "free-delivery",
    })
  })
})

describe("recordAuditLogsDeletedAudit", () => {
  it("files the deletion under settings as a warning against the admin making the request, keeping the deleted ids", () => {
    recordAuditLogsDeletedAudit("2", { metadata: { ids: ["log-1", "log-2"] } })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.AUDIT_LOG_DELETED,
      category: "settings",
      detail: undefined,
      metadata: { ids: ["log-1", "log-2"] },
      resourceId: "2",
      severity: "warning",
      target: "2",
    })
  })
})

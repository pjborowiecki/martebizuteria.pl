import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  recordEmailDeferredAudit,
  recordEmailFailedAudit,
  recordEmailResendRequestedAudit,
  recordEmailSentAudit,
  recordNewsletterSentAudit,
  recordOrderEmailOutcome,
} from "~/src/modules/audit-log/audit-log.events.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/audit-log.record.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("recordOrderEmailOutcome", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

  afterAll(() => {
    consoleError.mockRestore()
  })

  const metadata = { idempotencyKey: "order-confirmation/order-5", orderEmail: { kind: "order-confirmation" } }

  it("records a sent email with the delivery that sent it when there is no failure", () => {
    recordOrderEmailOutcome({ failure: undefined, label: "Order confirmation", metadata, orderId: "order-5", willRetry: false })

    expect(consoleError).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.EMAIL_SENT,
      category: "email",
      detail: "Order confirmation",
      metadata,
      resourceId: "order-5",
      severity: "success",
      target: "order-5",
    })
  })

  it("logs and records a failed email that will be tried again as deferred, with the reason appended", () => {
    recordOrderEmailOutcome({ failure: "smtp timeout", label: "Order confirmation", metadata, orderId: "order-5", willRetry: true })

    expect(consoleError).toHaveBeenCalledWith("Order confirmation failed for order order-5: smtp timeout")
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.EMAIL_DEFERRED,
      category: "email",
      detail: "Order confirmation — smtp timeout",
      metadata,
      resourceId: "order-5",
      severity: "warning",
      target: "order-5",
    })
  })

  it("logs and records a failed email that will not be tried again as failed, with the reason appended", () => {
    recordOrderEmailOutcome({ failure: "smtp timeout", label: "Order confirmation", metadata, orderId: "order-5", willRetry: false })

    expect(consoleError).toHaveBeenCalledWith("Order confirmation failed for order order-5: smtp timeout")
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        action: AUDIT_LOG_ACTION.EMAIL_FAILED,
        detail: "Order confirmation — smtp timeout",
        metadata,
        severity: "error",
      }),
    )
  })
})

describe("recordEmailDeferredAudit", () => {
  it("records a delayed email as a warning against its target", () => {
    recordEmailDeferredAudit("order-5", { detail: "Order shipped — rate limited" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.EMAIL_DEFERRED,
      category: "email",
      detail: "Order shipped — rate limited",
      metadata: undefined,
      resourceId: "order-5",
      severity: "warning",
      target: "order-5",
    })
  })
})

describe("recordEmailResendRequestedAudit", () => {
  it("files the resend against the order and the admin making the request", () => {
    recordEmailResendRequestedAudit("order-5", { detail: "Order shipped → anna@example.com — rate limited" })

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.EMAIL_RESEND_REQUESTED,
      category: "email",
      detail: "Order shipped → anna@example.com — rate limited",
      metadata: undefined,
      resourceId: "order-5",
      severity: "info",
      target: "order-5",
    })
  })
})

describe("email delivery audit events", () => {
  it("records a delivered email as a success against the recipient", () => {
    recordEmailSentAudit("ada@example.test", { detail: "Order confirmation" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.EMAIL_SENT,
      category: "email",
      detail: "Order confirmation",
      metadata: undefined,
      resourceId: "ada@example.test",
      severity: "success",
      target: "ada@example.test",
    })
  })

  it("records a rejected email as an error against the recipient", () => {
    recordEmailFailedAudit("ada@example.test", { detail: "mailbox full", metadata: { provider: "resend" } })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.EMAIL_FAILED,
      category: "email",
      detail: "mailbox full",
      metadata: { provider: "resend" },
      resourceId: "ada@example.test",
      severity: "error",
      target: "ada@example.test",
    })
  })
})

describe("recordNewsletterSentAudit", () => {
  it("files the newsletter under email against the admin who sent it, named by its subject", () => {
    recordNewsletterSentAudit("Jesienne projekty", {
      detail: "12 confirmed subscribers",
      metadata: { recipientCount: 12 },
      resourceId: "campaign-1",
    })

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.NEWSLETTER_SENT,
      category: "email",
      detail: "12 confirmed subscribers",
      metadata: { recipientCount: 12 },
      resourceId: "campaign-1",
      severity: "info",
      target: "Jesienne projekty",
    })
  })
})

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import {
  recordDiscountRedeemedAudit,
  recordOrderCancelledAudit,
  recordOrderDeliveredAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderFulfillmentFailedAudit,
  recordOrderFulfillmentStartedAudit,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderRefundAudit,
  recordOrderRefundFailedAudit,
  recordOrderRefundRequestedAudit,
  recordOrderReleasedAudit,
  recordOrderRestockedAudit,
  recordOrderShipmentCreatedAudit,
  recordOrderShippedAudit,
  recordOrderSteppedBackAudit,
  recordOrderTrackingUpdatedAudit,
  recordOrderWithdrawalReceivedAudit,
} from "~/src/modules/audit-log/use-cases/record-order-audit.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/use-cases/schedule-audit-log.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("order lifecycle audit events", () => {
  it("records a placed order as a success", () => {
    recordOrderPlacedAudit("order-1")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: AUDIT_LOG_ACTION.ORDER_PLACED, category: "orders", severity: "success" }),
    )
  })

  it("records a cancellation as a warning against the admin making the request", () => {
    recordOrderCancelledAudit("order-1")

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(
      expect.objectContaining({ action: AUDIT_LOG_ACTION.ORDER_CANCELLED, severity: "warning" }),
    )
  })

  it("records a failed payment as an error against the payment intent", () => {
    recordOrderPaymentFailedAudit("pi_123")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_LOG_ACTION.ORDER_PAYMENT_FAILED,
        resourceId: "pi_123",
        severity: "error",
        target: "pi_123",
      }),
    )
  })
})

interface TargetAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (target: string, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

const ORDER_CASES: readonly TargetAuditCase[] = [
  {
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_CAPTURED,
    name: "a captured payment",
    record: recordOrderPaymentCapturedAudit,
    severity: "success",
  },
  { action: AUDIT_LOG_ACTION.ORDER_REFUND_INITIATED, name: "a started refund", record: recordOrderRefundAudit, severity: "warning" },
  { action: AUDIT_LOG_ACTION.ORDER_RELEASED, name: "a released reservation", record: recordOrderReleasedAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED, name: "an opened dispute", record: recordOrderDisputeOpenedAudit, severity: "warning" },
  { action: AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED, name: "a closed dispute", record: recordOrderDisputeClosedAudit, severity: "info" },
]

describe("remaining order audit events", () => {
  it.each(ORDER_CASES)("files $name under the orders category as the system", ({ action, record: recordAudit, severity }) => {
    recordAudit("order-7")

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action,
      category: "orders",
      detail: undefined,
      metadata: undefined,
      resourceId: "order-7",
      severity,
      target: "order-7",
    })
  })

  it.each(ORDER_CASES)("keeps the detail and resource id handed to $name", ({ record: recordAudit }) => {
    recordAudit("order-7", { detail: "handled by Stripe", resourceId: "pi_42" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "handled by Stripe", resourceId: "pi_42", target: "order-7" }),
    )
  })
})

const ADMIN_ORDER_CASES: readonly TargetAuditCase[] = [
  {
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
    name: "the start of fulfillment",
    record: recordOrderFulfillmentStartedAudit,
    severity: "info",
  },
  { action: AUDIT_LOG_ACTION.ORDER_SHIPPED, name: "a shipped order", record: recordOrderShippedAudit, severity: "success" },
  { action: AUDIT_LOG_ACTION.ORDER_DELIVERED, name: "a delivered order", record: recordOrderDeliveredAudit, severity: "info" },
  { action: AUDIT_LOG_ACTION.ORDER_STEPPED_BACK, name: "an order stepped back", record: recordOrderSteppedBackAudit, severity: "warning" },
  {
    action: AUDIT_LOG_ACTION.ORDER_TRACKING_UPDATED,
    name: "a tracking number saved on a shipped order",
    record: recordOrderTrackingUpdatedAudit,
    severity: "info",
  },
  { action: AUDIT_LOG_ACTION.ORDER_CANCELLED, name: "a cancelled order", record: recordOrderCancelledAudit, severity: "warning" },
  {
    action: AUDIT_LOG_ACTION.ORDER_REFUND_REQUESTED,
    name: "a refund the admin asked Stripe for",
    record: recordOrderRefundRequestedAudit,
    severity: "warning",
  },
  { action: AUDIT_LOG_ACTION.ORDER_RESTOCKED, name: "items returned to stock", record: recordOrderRestockedAudit, severity: "info" },
  {
    action: AUDIT_LOG_ACTION.ORDER_SHIPMENT_CREATED,
    name: "a booked InPost shipment",
    record: recordOrderShipmentCreatedAudit,
    severity: "info",
  },
]

describe("order actions an admin takes", () => {
  it.each(ADMIN_ORDER_CASES)(
    "files $name under the orders category against the admin making the request",
    ({ action, record: recordAudit, severity }) => {
      recordAudit("order-7")

      expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
      expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
        action,
        category: "orders",
        detail: undefined,
        metadata: undefined,
        resourceId: "order-7",
        severity,
        target: "order-7",
      })
    },
  )

  it.each(ADMIN_ORDER_CASES)("keeps the detail and resource id handed to $name", ({ record: recordAudit }) => {
    recordAudit("order-7", { detail: "PL123456789", resourceId: "order-7" })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "PL123456789", resourceId: "order-7", target: "order-7" }),
    )
  })
})

describe("a withdrawal from the contract", () => {
  it("files it as a warning under the order, credited to the consumer who made the statement", () => {
    const consumer: AuditLogActorInput = { email: "anna@example.com", name: "Anna Kowalska", role: "customer" }

    recordOrderWithdrawalReceivedAudit("order-7", consumer, { detail: "MRT-2026-00042", metadata: { scope: "items" } })

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.ORDER_WITHDRAWAL_RECEIVED,
      actor: consumer,
      category: "orders",
      detail: "MRT-2026-00042",
      metadata: { scope: "items" },
      resourceId: "order-7",
      severity: "warning",
      target: "order-7",
    })
  })
})

describe("recordOrderFulfillmentFailedAudit", () => {
  it("files a paid session that created no order as an error under the session's own entry id", () => {
    recordOrderFulfillmentFailedAudit("cs_test_1", { detail: "548,00 PLN — anna@example.com — D1 unavailable" })

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED,
      category: "orders",
      detail: "548,00 PLN — anna@example.com — D1 unavailable",
      id: "order.fulfillment_failed:cs_test_1",
      metadata: undefined,
      resourceId: "cs_test_1",
      severity: "error",
      target: "cs_test_1",
    })
  })

  it("names the same entry for every failed delivery of one session and a new one for another session", () => {
    recordOrderFulfillmentFailedAudit("cs_test_1", { detail: "D1 unavailable" })
    recordOrderFulfillmentFailedAudit("cs_test_1", { detail: "no pending checkout" })
    recordOrderFulfillmentFailedAudit("cs_test_2", { detail: "D1 unavailable" })

    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "order.fulfillment_failed:cs_test_1" }))
    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "order.fulfillment_failed:cs_test_1" }))
    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: "order.fulfillment_failed:cs_test_2" }))
  })
})

describe("recordOrderRefundFailedAudit", () => {
  it("files a refund Stripe could not complete as a warning against the order, under the refund's own entry id", () => {
    recordOrderRefundFailedAudit("order-7", "re_test_1", { detail: "38900 — failed — lost_or_stolen_card", resourceId: "order-7" })

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.ORDER_REFUND_FAILED,
      category: "orders",
      detail: "38900 — failed — lost_or_stolen_card",
      id: "order.refund_failed:re_test_1",
      metadata: undefined,
      resourceId: "order-7",
      severity: "warning",
      target: "order-7",
    })
  })

  it("names the same entry for every delivery about one refund and a new one for another refund of the order", () => {
    recordOrderRefundFailedAudit("order-7", "re_test_1")
    recordOrderRefundFailedAudit("order-7", "re_test_1")
    recordOrderRefundFailedAudit("order-7", "re_test_2")

    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "order.refund_failed:re_test_1" }))
    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "order.refund_failed:re_test_1" }))
    expect(record.scheduleSystemAuditLog).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: "order.refund_failed:re_test_2" }))
  })
})

describe("recordDiscountRedeemedAudit", () => {
  it("records the redemption against the order as the system, with the amount saved as detail", () => {
    recordDiscountRedeemedAudit("order-9", { detail: "2000" })

    expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.DISCOUNT_REDEEMED,
      category: "orders",
      detail: "2000",
      metadata: undefined,
      resourceId: "order-9",
      severity: "info",
      target: "order-9",
    })
  })
})

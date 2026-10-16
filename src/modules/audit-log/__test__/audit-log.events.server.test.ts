import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import {
  type AuditEventOptions,
  recordAuditLogsDeletedAudit,
  recordAuthLoginAudit,
  recordAuthLoginFailedAudit,
  recordAuthLogoutAudit,
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
  recordContentPageUpdatedAudit,
  recordCustomerCartAbandonedAudit,
  recordCustomerCartItemAddedAudit,
  recordCustomerDeletionFailedAudit,
  recordCustomerPageViewedAudit,
  recordCustomerRegisteredAudit,
  recordCustomerUpdatedAudit,
  recordDeliveryMethodAudit,
  recordDiscountCreatedAudit,
  recordDiscountDeletedAudit,
  recordDiscountRedeemedAudit,
  recordDiscountUpdatedAudit,
  recordImageUploadedAudit,
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
  recordSalesPausedAudit,
  recordSalesResumedAudit,
  recordSettingsUpdatedAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.record.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/audit-log.record.server", () => record)

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

describe("recordCustomerRegisteredAudit", () => {
  it("adds the registered address to the metadata", () => {
    recordCustomerRegisteredAudit("new@example.test")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.CUSTOMER_REGISTERED,
      category: "customers",
      detail: undefined,
      metadata: { email: "new@example.test" },
      resourceId: "new@example.test",
      severity: "success",
      target: "new@example.test",
    })
  })

  it("merges the address into existing metadata", () => {
    recordCustomerRegisteredAudit("new@example.test", { metadata: { provider: "google" } })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { email: "new@example.test", provider: "google" },
      }),
    )
  })
})

describe("recordCustomerDeletionFailedAudit", () => {
  it("files the kept account as an error under customers, against the account", () => {
    recordCustomerDeletionFailedAudit("anna@example.test", { detail: "Stripe is unreachable", resourceId: "user-7" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED,
      category: "customers",
      detail: "Stripe is unreachable",
      metadata: undefined,
      resourceId: "user-7",
      severity: "error",
      target: "anna@example.test",
    })
  })
})

describe("actor targeted audit events", () => {
  const actor = { email: "ada@example.test", id: "user-7", name: "Ada Lovelace", role: "customer" } as const

  it("targets the trimmed email and falls back to the actor name as detail", () => {
    recordAuthLoginAudit({ ...actor, email: "  ada@example.test  " }, { ip: "198.51.100.4" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN,
      actor: { ...actor, email: "  ada@example.test  " },
      category: "auth",
      detail: "Ada Lovelace",
      ip: "198.51.100.4",
      metadata: { email: "ada@example.test" },
      resourceId: "user-7",
      severity: "info",
      target: "ada@example.test",
    })
  })

  it("targets the actor name when the email is blank", () => {
    recordAuthLogoutAudit({ id: "user-7", name: "Ada Lovelace", role: "customer" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGOUT,
      actor: { id: "user-7", name: "Ada Lovelace", role: "customer" },
      category: "auth",
      detail: undefined,
      ip: undefined,
      metadata: undefined,
      resourceId: "user-7",
      severity: "info",
      target: "Ada Lovelace",
    })
  })

  it("treats a whitespace only email as blank", () => {
    recordAuthLogoutAudit({ email: "   ", id: "user-7", name: "Ada Lovelace", role: "customer" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(expect.objectContaining({ metadata: undefined, target: "Ada Lovelace" }))
  })

  it("prefers an explicit detail and resource id over the actor fields", () => {
    recordCustomerCartAbandonedAudit(actor, { detail: "3 items left behind", resourceId: "cart-3" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "3 items left behind",
        resourceId: "cart-3",
        severity: "warning",
        target: "ada@example.test",
      }),
    )
  })
})

describe("recordAuthLoginFailedAudit", () => {
  it("falls back to the target as detail and leaves the resource id unset", () => {
    recordAuthLoginFailedAudit("ghost@example.test")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
      category: "auth",
      detail: "ghost@example.test",
      ip: undefined,
      metadata: undefined,
      resourceId: undefined,
      severity: "warning",
      target: "ghost@example.test",
    })
  })

  it("keeps a supplied detail and ip", () => {
    recordAuthLoginFailedAudit("ghost@example.test", { detail: "wrong password", ip: "198.51.100.9" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(expect.objectContaining({ detail: "wrong password", ip: "198.51.100.9" }))
  })
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

describe("resolveAuthAuditActor", () => {
  it("maps the admin role", () => {
    expect(resolveAuthAuditActor({ email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" })).toStrictEqual({
      email: "admin@example.test",
      id: "user-1",
      name: "Admin",
      role: "admin",
    })
  })

  it("maps the customer role", () => {
    expect(resolveAuthAuditActor({ email: "ada@example.test", id: "user-2", name: "Ada", role: "customer" }).role).toBe("customer")
  })

  it("falls back to unknown for an unrecognised role", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-3", name: "Bot", role: "editor" }).role).toBe("unknown")
  })

  it("falls back to unknown when the role is missing", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-4", name: "Bot" }).role).toBe("unknown")
  })

  it("falls back to unknown for a null role", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-5", name: "Bot", role: null }).role).toBe("unknown")
  })
})

interface TargetAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (target: string, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

interface ActorAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (actor: AuditLogActorInput, options?: AuditEventOptions) => void
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

const CUSTOMER_ACTOR_CASES: readonly ActorAuditCase[] = [
  {
    action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
    name: "an item added to a basket",
    record: recordCustomerCartItemAddedAudit,
    severity: "info",
  },
  { action: AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED, name: "a page view", record: recordCustomerPageViewedAudit, severity: "info" },
]

describe("customer activity audit events", () => {
  const actor: AuditLogActorInput = { email: "ada@example.test", id: "user-7", name: "Ada Lovelace", role: "customer" }

  it.each(CUSTOMER_ACTOR_CASES)("targets the customer email for $name", ({ action, record: recordAudit, severity }) => {
    recordAudit(actor, { ip: "198.51.100.4" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action,
      actor,
      category: "customers",
      detail: "Ada Lovelace",
      ip: "198.51.100.4",
      metadata: { email: "ada@example.test" },
      resourceId: "user-7",
      severity,
      target: "ada@example.test",
    })
  })

  it.each(CUSTOMER_ACTOR_CASES)("falls back to the customer name for $name when no email is known", ({ record: recordAudit }) => {
    recordAudit({ id: "user-7", name: "Ada Lovelace", role: "customer" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: undefined, resourceId: "user-7", target: "Ada Lovelace" }),
    )
  })
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

describe("recordCustomerUpdatedAudit", () => {
  it("files the edit under customers against the admin making the request, targeting the customer's address", () => {
    recordCustomerUpdatedAudit("ada@example.test", { resourceId: "user-7" })

    expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.CUSTOMER_UPDATED,
      category: "customers",
      detail: undefined,
      metadata: undefined,
      resourceId: "user-7",
      severity: "info",
      target: "ada@example.test",
    })
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

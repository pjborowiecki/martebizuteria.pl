import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import {
  type AuditEventOptions,
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
  recordCustomerCartAbandonedAudit,
  recordCustomerCartItemAddedAudit,
  recordCustomerPageViewedAudit,
  recordCustomerRegisteredAudit,
  recordEmailFailedAudit,
  recordEmailSentAudit,
  recordOrderCancelledAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderFulfillmentStartedAudit,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderRefundAudit,
  recordOrderReleasedAudit,
  recordOrderShippedAudit,
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

  it("records a cancellation as a warning", () => {
    recordOrderCancelledAudit("order-1")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
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

describe("recordOrderEmailOutcome", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

  afterAll(() => {
    consoleError.mockRestore()
  })

  it("records a sent email when there is no failure", () => {
    recordOrderEmailOutcome({ failure: undefined, label: "Order confirmation", orderId: "order-5" })

    expect(consoleError).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_LOG_ACTION.EMAIL_SENT,
        category: "email",
        detail: "Order confirmation",
        resourceId: "order-5",
        severity: "success",
      }),
    )
  })

  it("logs and records a failed email with the reason appended", () => {
    recordOrderEmailOutcome({ failure: "smtp timeout", label: "Order confirmation", orderId: "order-5" })

    expect(consoleError).toHaveBeenCalledWith("Order confirmation failed for order order-5: smtp timeout")
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_LOG_ACTION.EMAIL_FAILED,
        detail: "Order confirmation — smtp timeout",
        severity: "error",
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
  {
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
    name: "the start of fulfillment",
    record: recordOrderFulfillmentStartedAudit,
    severity: "info",
  },
  { action: AUDIT_LOG_ACTION.ORDER_SHIPPED, name: "a shipped order", record: recordOrderShippedAudit, severity: "success" },
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

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION, type AuditLogAction, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import {
  recordCustomerCartAbandonedAudit,
  recordCustomerCartItemAddedAudit,
  recordCustomerDeletionFailedAudit,
  recordCustomerOrdersClaimedAudit,
  recordCustomerPageViewedAudit,
  recordCustomerRegisteredAudit,
  recordCustomerStripeEmailFailedAudit,
  recordCustomerUpdatedAudit,
} from "~/src/modules/audit-log/use-cases/record-customer-audit.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/use-cases/schedule-audit-log.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
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

  it("records an abandoned cart against the customer's address and id, without their name as the detail", () => {
    recordCustomerCartAbandonedAudit(actor, { metadata: { itemCount: 3 } })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: undefined,
        metadata: { email: "ada@example.test", itemCount: 3 },
        resourceId: "user-7",
        target: "ada@example.test",
      }),
    )
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

interface ActorAuditCase {
  readonly action: AuditLogAction
  readonly name: string
  readonly record: (actor: AuditLogActorInput, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

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

const customer: AuditLogActorInput = { email: "ada@example.test", id: "user-7", name: "Ada Lovelace", role: "customer" }

describe("recordCustomerOrdersClaimedAudit", () => {
  it("files the guest orders an account took over under customers, from the system, against the account", () => {
    recordCustomerOrdersClaimedAudit("ada@example.test", {
      metadata: { orderCount: 2, orderIds: ["order-1", "order-2"] },
      resourceId: "user-7",
    })

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.CUSTOMER_ORDERS_CLAIMED,
      category: "customers",
      detail: undefined,
      metadata: { orderCount: 2, orderIds: ["order-1", "order-2"] },
      resourceId: "user-7",
      severity: "info",
      target: "ada@example.test",
    })
  })
})

describe("recordCustomerStripeEmailFailedAudit", () => {
  it("files the Stripe customer that kept the old address under customers, from the system, against the account", () => {
    recordCustomerStripeEmailFailedAudit(customer, { detail: "Error: Stripe is down", ip: "198.51.100.4" })

    expect(record.scheduleAuditLog).not.toHaveBeenCalled()
    expect(record.scheduleSystemAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: AUDIT_LOG_ACTION.CUSTOMER_STRIPE_EMAIL_FAILED,
      category: "customers",
      detail: "Error: Stripe is down",
      ip: "198.51.100.4",
      metadata: { email: "ada@example.test" },
      resourceId: "user-7",
      severity: "warning",
      target: "ada@example.test",
    })
  })
})

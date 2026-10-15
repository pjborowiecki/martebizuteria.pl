import type Stripe from "stripe"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { CART_ITEM, requestOn, updateInput } from "~/src/integrations/stripe/__test__/fixtures/checkout-session-inputs"
import { checkoutSession, checkoutSessionExpiredEvent } from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"
import { handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

const { audits, rival, sqlite, stripeSessions } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    audits: { recordOrderReleasedAudit: vi.fn() },
    rival: { grabs: 0, triesAtBatches: false, triesAtEveryRoundTrip: false },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stripeSessions: {
      create: vi.fn<(params: object) => Promise<object>>(),
      expire: vi.fn<(sessionId: string) => Promise<object>>(),
      retrieve: vi.fn<(sessionId: string, params: object) => Promise<object>>(),
    },
  }
})

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "test" } }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => requestOn("http://127.0.0.1:3000") }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(null) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        if (rival.triesAtEveryRoundTrip || (rival.triesAtBatches && trip.kind === "batch")) {
          const taken = sqlite
            .prepare(
              "update inventory set quantity_available = quantity_available - 1, quantity_reserved = quantity_reserved + 1 where variant_id = ? and quantity_available >= 1",
            )
            .run(CART_ITEM.variantId)
          rival.grabs += Number(taken.changes)
        }
      }),
      { schema },
    ),
  }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: stripeSessions } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audits)

const OLD_SESSION = "cs_old"

const NEW_SESSION = "cs_new"

const heldBy = (qty: number) => [{ qty, variantId: CART_ITEM.variantId }]

const editOf = (qty: number) => updateInput({ email: "anna.nowak@example.com" }, [{ ...CART_ITEM, qty }])

const openSession = (heldQty: number): Stripe.Checkout.Session => ({
  ...checkoutSession({ id: OLD_SESSION, metadata: { checkoutId: "checkout-1", items: JSON.stringify(heldBy(heldQty)) } }),
  status: "open",
})

const holdInCheckout = ({ available, held }: { available: number; held: number }): void => {
  sqlite.exec(`
    update inventory set quantity_available = ${String(available)}, quantity_reserved = ${String(held)} where variant_id = '${CART_ITEM.variantId}';
    insert into checkout (id, email, status) values ('checkout-1', 'anna@example.com', 'pending');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-1', 'checkout-1', 24900, 'stripe', 'pending', '${OLD_SESSION}', '${JSON.stringify(heldBy(held))}');
  `)
  stripeSessions.retrieve.mockResolvedValue(openSession(held))
}

const stockSchema = z.object({ available: z.number(), reserved: z.number() })

const readStock = () =>
  stockSchema.parse(
    sqlite
      .prepare("select quantity_available as available, quantity_reserved as reserved from inventory where variant_id = ?")
      .get(CART_ITEM.variantId),
  )

const paymentSchema = z.object({ checkout: z.string(), payment: z.string(), reservedLines: z.string(), transactionId: z.string() })

const readPayment = () => {
  const row = paymentSchema.parse(
    sqlite
      .prepare(
        "select checkout.status as checkout, payment.status as payment, payment.reserved_lines as reservedLines, payment.transaction_id as transactionId from payment join checkout on checkout.id = payment.checkout_id where payment.id = 'payment-1'",
      )
      .get(),
  )

  return { ...row, reservedLines: JSON.parse(row.reservedLines) as unknown }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-1', '${CART_ITEM.slug}', 'published', '{"pl-PL":"${CART_ITEM.title}"}');
    insert into product_variant (id, product_id, title, price) values ('${CART_ITEM.variantId}', 'product-1', '${CART_ITEM.variantTitle}', 24900);
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-1', '${CART_ITEM.variantId}', 0, 0);
    insert into courier (id, internal_code, name) values ('courier-dpd', 'dpd', 'DPD');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type)
      values ('dpd-courier', 'dpd_classic', 'courier-dpd', 'Kurier DPD', 1500, 'courier');
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  rival.grabs = 0
  rival.triesAtBatches = false
  rival.triesAtEveryRoundTrip = false
  sqlite.exec("delete from payment; delete from checkout; delete from address;")
  stripeSessions.create.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_new_secret", id: NEW_SESSION })
  stripeSessions.expire.mockResolvedValue({})
})

afterAll(() => {
  sqlite.close()
})

describe("a shopper editing the checkout that holds the last piece", () => {
  it("keeps the piece through the whole hand-over to the new payment session while another shopper tries for it at every step", async () => {
    holdInCheckout({ available: 0, held: 1 })
    rival.triesAtEveryRoundTrip = true

    await expect(handleUpdateCheckoutSession(editOf(1))).resolves.toMatchObject({ sessionId: NEW_SESSION })

    expect(rival.grabs).toBe(0)
    expect(readStock()).toStrictEqual({ available: 0, reserved: 1 })
    expect(readPayment()).toStrictEqual({ checkout: "pending", payment: "pending", reservedLines: heldBy(1), transactionId: NEW_SESSION })
    expect(stripeSessions.expire).toHaveBeenCalledExactlyOnceWith(OLD_SESSION)
  })

  it("lets the old session's expiry webhook release nothing and record no release once the piece has moved on", async () => {
    holdInCheckout({ available: 0, held: 1 })
    await handleUpdateCheckoutSession(editOf(1))

    const handleExpiry = webhookHandlers["checkout.session.expired"]
    await handleExpiry?.(checkoutSessionExpiredEvent({ ...openSession(1), status: "expired" }))

    expect(readStock()).toStrictEqual({ available: 0, reserved: 1 })
    expect(readPayment()).toMatchObject({ checkout: "pending", payment: "pending", transactionId: NEW_SESSION })
    expect(audits.recordOrderReleasedAudit).not.toHaveBeenCalled()
  })
})

describe("a shopper editing the checkout to take more of a variant", () => {
  it("holds the extra unit as well as the one it already had", async () => {
    holdInCheckout({ available: 1, held: 1 })

    await expect(handleUpdateCheckoutSession(editOf(2))).resolves.toMatchObject({ sessionId: NEW_SESSION })

    expect(readStock()).toStrictEqual({ available: 0, reserved: 2 })
    expect(readPayment()).toMatchObject({ reservedLines: heldBy(2), transactionId: NEW_SESSION })
  })

  it("tells the shopper the stock ran out and keeps the old session and its piece when another shopper takes the extra unit first", async () => {
    holdInCheckout({ available: 1, held: 1 })
    rival.triesAtBatches = true

    await expect(handleUpdateCheckoutSession(editOf(2))).rejects.toMatchObject({ message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY })

    expect(rival.grabs).toBe(1)
    expect(readStock()).toStrictEqual({ available: 0, reserved: 2 })
    expect(readPayment()).toStrictEqual({ checkout: "pending", payment: "pending", reservedLines: heldBy(1), transactionId: OLD_SESSION })
    expect(stripeSessions.create).not.toHaveBeenCalled()
    expect(stripeSessions.expire).not.toHaveBeenCalled()
  })

  it("gives the extra unit back and keeps the old session's piece when Stripe will not expire the old session", async () => {
    holdInCheckout({ available: 1, held: 1 })
    const refusal = new Error("This Checkout Session is no longer open")
    stripeSessions.expire.mockRejectedValueOnce(refusal)

    await expect(handleUpdateCheckoutSession(editOf(2))).rejects.toBe(refusal)

    expect(readStock()).toStrictEqual({ available: 1, reserved: 1 })
    expect(readPayment()).toMatchObject({ payment: "pending", transactionId: OLD_SESSION })
    expect(stripeSessions.expire.mock.calls).toStrictEqual([[OLD_SESSION], [NEW_SESSION]])
  })
})

describe("a shopper editing the checkout to take less of a variant", () => {
  it("returns the units the edited cart dropped and keeps the rest held", async () => {
    holdInCheckout({ available: 0, held: 2 })

    await expect(handleUpdateCheckoutSession(editOf(1))).resolves.toMatchObject({ sessionId: NEW_SESSION })

    expect(readStock()).toStrictEqual({ available: 1, reserved: 1 })
    expect(readPayment()).toMatchObject({ reservedLines: heldBy(1), transactionId: NEW_SESSION })
  })
})

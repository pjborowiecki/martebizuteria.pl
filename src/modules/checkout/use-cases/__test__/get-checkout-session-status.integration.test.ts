import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getCheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"

const { catalogInvalidated, retrieveSession, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    catalogInvalidated: vi.fn(),
    retrieveSession: vi.fn<(sessionId: string, params: object) => Promise<object>>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getRequest: () => new Request("https://marte.test/en-US/checkout", { headers: { "cf-connecting-ip": "203.0.113.7" } }),
  }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(null) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { retrieve: retrieveSession } } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: catalogInvalidated,
}))

const HELD_RING = {
  handle: "aura",
  imageUrl: "https://assets.test/aura.jpg",
  price: 18_900,
  qty: 1,
  title: "Ring",
  variantId: "variant-ring",
}

const CHECKOUT_RATE_LIMIT = 10

const statusOf = (sessionId: string) => getCheckoutSessionStatus({ data: { sessionId } })

const ringStockSchema = z.object({ quantity_available: z.number(), quantity_reserved: z.number() })

const readRingStock = () =>
  ringStockSchema.parse(
    sqlite.prepare("select quantity_available, quantity_reserved from inventory where variant_id = 'variant-ring'").get(),
  )

const readStatuses = () =>
  z
    .object({ checkout: z.string(), payment: z.string() })
    .parse(
      sqlite
        .prepare(
          "select checkout.status as checkout, payment.status as payment from payment join checkout on checkout.id = payment.checkout_id where payment.transaction_id = 'cs_held'",
        )
        .get(),
    )

const holdTheLastRing = (): void => {
  sqlite.exec(`
    delete from rate_limit;
    delete from payment;
    delete from checkout;
    update inventory set quantity_available = 0, quantity_reserved = 1 where variant_id = 'variant-ring';
    insert into checkout (id, email, status) values ('checkout-held', 'ada@marte.test', 'pending'), ('checkout-paid', 'grace@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines) values
      ('payment-held', 'checkout-held', 18900, 'stripe', 'pending', 'cs_held', '[{"qty":1,"variantId":"variant-ring"}]'),
      ('payment-paid', 'checkout-paid', 18900, 'stripe', 'succeeded', 'cs_paid', '[]');
  `)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-aura', 'aura', 'published', '{"en-US":"Aura"}');
    insert into product_variant (id, product_id, title) values ('variant-ring', 'product-aura', 'Ring');
    insert into inventory (id, variant_id, quantity_available) values ('inventory-ring', 'variant-ring', 0);
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  holdTheLastRing()
  retrieveSession.mockResolvedValue({ id: "cs_held", metadata: { items: JSON.stringify([HELD_RING]) }, status: "open" })
})

afterAll(() => {
  sqlite.close()
})

describe("getCheckoutSessionStatus against the migrated schema", () => {
  it("reports a checkout the webhook already fulfilled as complete without asking Stripe", async () => {
    await expect(statusOf("cs_paid")).resolves.toBe("complete")

    expect(retrieveSession).not.toHaveBeenCalled()
  })

  it("keeps a session Stripe still offers for payment open, with the last ring still held for it", async () => {
    await expect(statusOf("cs_held")).resolves.toBe("open")

    expect(retrieveSession).toHaveBeenCalledExactlyOnceWith("cs_held", { expand: ["payment_intent"] })
    expect(readRingStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 1 })
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
  })

  it("reports a session whose BLIK payment waits for approval in the banking app as processing, with the last ring still held for it", async () => {
    retrieveSession.mockResolvedValue({
      id: "cs_held",
      metadata: { items: JSON.stringify([HELD_RING]) },
      payment_intent: { next_action: { type: "blik_authorize" }, status: "requires_action" },
      status: "open",
    })

    await expect(statusOf("cs_held")).resolves.toBe("processing")

    expect(readRingStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 1 })
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
    expect(catalogInvalidated).not.toHaveBeenCalled()
  })

  it("reports a session that completed before its delayed-notification payment settled as processing, with the last ring still held for it", async () => {
    retrieveSession.mockResolvedValue({
      id: "cs_held",
      metadata: { items: JSON.stringify([HELD_RING]) },
      payment_intent: { next_action: null, status: "processing" },
      payment_status: "unpaid",
      status: "complete",
    })

    await expect(statusOf("cs_held")).resolves.toBe("processing")

    expect(readRingStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 1 })
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
  })

  it("returns the last ring of a session Stripe expired before its webhook, once, so a fresh checkout finds it free", async () => {
    retrieveSession.mockResolvedValue({ id: "cs_held", metadata: { items: JSON.stringify([HELD_RING]) }, status: "expired" })

    await expect(statusOf("cs_held")).resolves.toBe("closed")
    await expect(statusOf("cs_held")).resolves.toBe("closed")
    await releaseCheckout({ lines: [{ qty: 1, variantId: "variant-ring" }], transactionId: "cs_held" })

    expect(retrieveSession).toHaveBeenCalledOnce()
    expect(readRingStock()).toStrictEqual({ quantity_available: 1, quantity_reserved: 0 })
    expect(readStatuses()).toStrictEqual({ checkout: "failed", payment: "failed" })
    expect(catalogInvalidated).toHaveBeenCalledOnce()
  })

  it("refuses an address that asks more often than the checkout rate allows", async () => {
    const answers = await Promise.allSettled(Array.from({ length: CHECKOUT_RATE_LIMIT + 1 }, () => statusOf("cs_paid")))

    expect(answers.filter((answer) => answer.status === "fulfilled")).toHaveLength(CHECKOUT_RATE_LIMIT)
    expect(answers.find((answer) => answer.status === "rejected")?.reason).toMatchObject({ code: ERROR_CODES.TOO_MANY_REQUESTS })
  })
})

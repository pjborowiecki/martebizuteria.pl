import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordDiscountRedeemedAudit: vi.fn(),
  recordOrderPlacedAudit: vi.fn(),
}))

const PRICE = 24_900

const paidSession: FulfillCheckoutFromSessionInput = {
  currency: "PLN",
  lines: [{ handle: "onyx-earrings", price: PRICE, qty: 1, title: "Onyx earrings — Silver", variantId: "variant-onyx" }],
  locale: "en-US",
  paidAmount: PRICE,
  transactionId: "cs_paid",
}

const readOrderUserId = (orderId: string | undefined) =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare(`select user_id from "order" where id = ?`).get(String(orderId)))
    .user_id

const openCheckout = (email: string) => {
  sqlite.exec(`
    insert into checkout (id, email, status) values ('checkout-paid', '${email}', 'pending');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-paid', 'checkout-paid', ${String(PRICE)}, 'stripe', 'pending', 'cs_paid', '[{"qty":1,"variantId":"variant-onyx"}]');
  `)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec(`
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    delete from user;
    delete from product;
    delete from order_number_sequence;
    insert into product (id, handle, status, titles) values ('product-onyx', 'onyx-earrings', 'published', '{"en-US":"Onyx earrings"}');
    insert into product_variant (id, product_id, title) values ('variant-onyx', 'product-onyx', 'Silver');
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-onyx', 'variant-onyx', 2, 1);
    insert into user (id, name, email, email_verified) values
      ('user-anna', 'Anna Kowalska', 'anna@example.com', 1),
      ('user-jan', 'Jan Nowak', 'jan@example.com', 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("the account a fulfilled order belongs to", () => {
  it("files the order under the verified account that owns the checkout's email, whatever its case", async () => {
    openCheckout("Anna@Example.com")

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBe("user-anna")
  })

  it("leaves the order a guest order when the account with that email has not verified it", async () => {
    openCheckout("jan@example.com")

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBeNull()
  })

  it("leaves the order a guest order when no account uses the email", async () => {
    openCheckout("ewa@example.com")

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBeNull()
  })

  it("files the order under the verified account that owns its email even when another account was signed in at checkout", async () => {
    openCheckout("anna@example.com")
    sqlite.exec(`update checkout set user_id = 'user-jan' where id = 'checkout-paid'`)

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBe("user-anna")
  })

  it("keeps the signed-in shopper's account on an order whose email no verified account owns", async () => {
    openCheckout("ewa@example.com")
    sqlite.exec(`update checkout set user_id = 'user-jan' where id = 'checkout-paid'`)

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBe("user-jan")
  })

  it("keeps the signed-in shopper's account on an order placed with their own email", async () => {
    openCheckout("Anna@example.com")
    sqlite.exec(`update checkout set user_id = 'user-anna' where id = 'checkout-paid'`)

    expect(readOrderUserId(await fulfillCheckout(paidSession))).toBe("user-anna")
  })
})

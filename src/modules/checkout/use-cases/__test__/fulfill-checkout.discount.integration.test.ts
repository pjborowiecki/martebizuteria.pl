import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"

const { recordDiscountRedeemedAudit, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    recordDiscountRedeemedAudit: vi.fn<(orderId: string, options: { detail: string }) => void>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordDiscountRedeemedAudit }))

const PRICE = 24_900

const DISCOUNT_AMOUNT = 2490

const paidSession: FulfillCheckoutFromSessionInput = {
  currency: "PLN",
  lines: [{ handle: "onyx-earrings", price: PRICE, qty: 1, title: "Onyx earrings — Silver", variantId: "variant-onyx" }],
  locale: "en-US",
  paidAmount: PRICE - DISCOUNT_AMOUNT,
  transactionId: "cs_paid",
}

const readUsage = () =>
  z.object({ usage_count: z.number() }).parse(sqlite.prepare("select usage_count from discount where id = 'disc-spring'").get()).usage_count

const readRedemptions = () =>
  z
    .array(z.object({ amount: z.number(), email: z.string(), order_id: z.string().nullable() }))
    .parse(sqlite.prepare("select amount, email, order_id from discount_redemption order by created_at").all())

const readClaimedCheckouts = () =>
  z
    .array(z.object({ checkout_id: z.string() }))
    .parse(sqlite.prepare("select checkout_id from discount_claim order by checkout_id").all())
    .map((row) => row.checkout_id)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`
    delete from discount_claim;
    delete from discount_redemption;
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    delete from discount;
    delete from product;
    delete from order_number_sequence;
    insert into product (id, handle, status, titles) values ('product-onyx', 'onyx-earrings', 'published', '{"en-US":"Onyx earrings"}');
    insert into product_variant (id, product_id, title) values ('variant-onyx', 'product-onyx', 'Silver');
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-onyx', 'variant-onyx', 2, 1);
    insert into discount (id, code, type, value, usage_count, usage_limit, per_customer_limit)
      values ('disc-spring', 'SPRING', 'percentage', 10, 2, 3, 1);
    insert into checkout (id, email, status, discount_id) values
      ('checkout-paid', 'anna@example.com', 'pending', 'disc-spring'),
      ('checkout-other', 'jan@example.com', 'pending', 'disc-spring');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-paid', 'checkout-paid', ${String(PRICE - DISCOUNT_AMOUNT)}, 'stripe', 'pending', 'cs_paid', '[{"qty":1,"variantId":"variant-onyx"}]');
    insert into discount_claim (id, checkout_id, discount_id, email) values
      ('claim-paid', 'checkout-paid', 'disc-spring', 'anna@example.com'),
      ('claim-other', 'checkout-other', 'disc-spring', 'jan@example.com');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("fulfilling a paid session that applied a discount code", () => {
  it("turns the checkout's hold into a redemption and counts the use with the order", async () => {
    const orderId = await fulfillCheckout(paidSession)

    expect(readRedemptions()).toStrictEqual([{ amount: DISCOUNT_AMOUNT, email: "anna@example.com", order_id: orderId }])
    expect(readUsage()).toBe(3)
    expect(readClaimedCheckouts()).toStrictEqual(["checkout-other"])
    expect(recordDiscountRedeemedAudit).toHaveBeenCalledExactlyOnceWith(orderId, { detail: String(DISCOUNT_AMOUNT) })
  })

  it("creates the order and records the use for a customer who paid after the code ran out", async () => {
    sqlite.exec(`
      update discount set usage_count = 3 where id = 'disc-spring';
      delete from discount_claim where checkout_id = 'checkout-paid';
      insert into discount_redemption (id, discount_id, email, amount, created_at, updated_at)
        values ('redemption-earlier', 'disc-spring', 'anna@example.com', 1000, 0, 0);
    `)

    const orderId = await fulfillCheckout(paidSession)

    expect(orderId).toStrictEqual(expect.any(String))
    expect(readRedemptions()).toStrictEqual([
      { amount: 1000, email: "anna@example.com", order_id: null },
      { amount: DISCOUNT_AMOUNT, email: "anna@example.com", order_id: orderId },
    ])
    expect(readUsage()).toBe(4)
  })

  it("counts the use once when a second delivery of the same payment races the first", async () => {
    const deliveries = await Promise.allSettled([fulfillCheckout(paidSession), fulfillCheckout(paidSession)])

    expect(deliveries.filter((delivery) => delivery.status === "fulfilled" && delivery.value !== undefined)).toHaveLength(1)
    expect(readRedemptions()).toHaveLength(1)
    expect(readUsage()).toBe(3)
  })
})

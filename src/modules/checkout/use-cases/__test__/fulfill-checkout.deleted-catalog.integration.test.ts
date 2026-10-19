import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"
import { currentOrderNumberPeriod } from "~/src/modules/order/use-cases/allocate-order-number.server"
import { deleteProducts } from "~/src/modules/product/product.accessors"

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
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork: vi.fn() }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordDiscountRedeemedAudit: vi.fn(),
  recordOrderPlacedAudit: vi.fn(),
}))

const PRICE = 24_900

const paidSession: FulfillCheckoutFromSessionInput = {
  currency: "PLN",
  lines: [
    { handle: "onyx-earrings", imageUrl: "onyx.webp", price: PRICE, qty: 1, title: "Onyx earrings — Silver", variantId: "variant-onyx" },
  ],
  locale: "en-US",
  paidAmount: PRICE,
  transactionId: "cs_paid",
}

const orderLineSchema = z.array(
  z.object({
    product_id: z.string().nullable(),
    quantity: z.number(),
    thumbnail: z.string().nullable(),
    title: z.string(),
    unit_price: z.number(),
    variant_id: z.string().nullable(),
  }),
)

const readOrderLines = () =>
  orderLineSchema.parse(sqlite.prepare("select product_id, variant_id, title, thumbnail, quantity, unit_price from order_item").all())

const readOrder = () =>
  z
    .array(z.object({ order_number: z.string(), status: z.string(), total: z.number() }))
    .parse(sqlite.prepare(`select order_number, status, total from "order"`).all())

const readStatuses = () =>
  z
    .object({ checkout: z.string(), payment: z.string() })
    .parse(
      sqlite
        .prepare(
          "select checkout.status as checkout, payment.status as payment from payment join checkout on checkout.id = payment.checkout_id",
        )
        .get(),
    )

const failOrderLinesOnce = (): void => {
  sqlite.exec(`
    create trigger order_item_unavailable before insert on order_item
    begin
      select raise(abort, 'D1_ERROR: database is locked');
    end;
  `)
}

const SNAPSHOT_WITHOUT_CATALOG = {
  product_id: null,
  quantity: 1,
  thumbnail: "onyx.webp",
  title: "Onyx earrings — Silver",
  unit_price: PRICE,
  variant_id: null,
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {})
  sqlite.exec(`
    drop trigger if exists order_item_unavailable;
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    delete from product;
    delete from order_number_sequence;
    insert into product (id, handle, status, titles) values ('product-onyx', 'onyx-earrings', 'published', '{"en-US":"Onyx earrings"}');
    insert into product_variant (id, product_id, title) values ('variant-onyx', 'product-onyx', 'Silver');
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-onyx', 'variant-onyx', 2, 1);
    insert into checkout (id, email, status) values ('checkout-paid', 'anna@example.com', 'pending');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-paid', 'checkout-paid', ${String(PRICE)}, 'stripe', 'pending', 'cs_paid', '[{"qty":1,"variantId":"variant-onyx"}]');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("fulfilling a paid session whose catalogue changed while the customer paid", () => {
  it("creates the order for a product deleted while the customer paid, from what they were charged for", async () => {
    await deleteProducts(["product-onyx"])

    await expect(fulfillCheckout(paidSession)).resolves.toStrictEqual(expect.any(String))

    expect(readOrderLines()).toStrictEqual([SNAPSHOT_WITHOUT_CATALOG])
    expect(readOrder()).toStrictEqual([{ order_number: `MRT-${currentOrderNumberPeriod()}-00001`, status: "processing", total: PRICE }])
    expect(readStatuses()).toStrictEqual({ checkout: "completed", payment: "succeeded" })
  })

  it("creates the order when only the variant was removed from a product that still exists", async () => {
    sqlite.exec("delete from product_variant where id = 'variant-onyx'")

    await fulfillCheckout(paidSession)

    expect(readOrderLines()).toStrictEqual([SNAPSHOT_WITHOUT_CATALOG])
  })

  it.each(["archived", "draft"])(
    "creates the order, linked to its product, when the product was made %s while the customer paid",
    async (status) => {
      sqlite.prepare("update product set status = ? where id = 'product-onyx'").run(status)

      await expect(fulfillCheckout(paidSession)).resolves.toStrictEqual(expect.any(String))

      expect(readOrderLines()).toStrictEqual([{ ...SNAPSHOT_WITHOUT_CATALOG, product_id: "product-onyx", variant_id: "variant-onyx" }])
      expect(readStatuses()).toStrictEqual({ checkout: "completed", payment: "succeeded" })
    },
  )

  it("links the line to its product and variant while they still exist", async () => {
    await fulfillCheckout(paidSession)

    expect(readOrderLines()).toStrictEqual([{ ...SNAPSHOT_WITHOUT_CATALOG, product_id: "product-onyx", variant_id: "variant-onyx" }])
  })

  it("gives a retried delivery the order number the failed one did not use", async () => {
    failOrderLinesOnce()

    await expect(fulfillCheckout(paidSession)).rejects.toThrow()
    expect(readOrder()).toStrictEqual([])
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })

    sqlite.exec("drop trigger order_item_unavailable")
    await fulfillCheckout(paidSession)

    expect(readOrder()).toStrictEqual([{ order_number: `MRT-${currentOrderNumberPeriod()}-00001`, status: "processing", total: PRICE }])
  })
})

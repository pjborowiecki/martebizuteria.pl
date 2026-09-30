import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1Query } from "~/src/platform/testing/mocks/d1"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch, resolvePendingCheckout } from "~/src/modules/checkout/checkout.utils"

const { queries, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    queries: [] as TestD1Query[],
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, (query) => {
        queries.push(query)
      }),
      { schema },
    ),
  }
})

const CHECKOUT_ID = "chk_1"

const TRANSACTION_ID = "cs_test_1"

const VARIANT_ID = "var_1"

const UNIT_PRICE = 5000

const RESERVED_QTY = 2

const paymentRow = { checkoutId: CHECKOUT_ID, id: "pay_1" }

const pendingCheckoutRow = { email: "buyer@example.com", status: "pending", userId: null }

const fulfillInput: FulfillCheckoutInput = {
  amount: UNIT_PRICE * RESERVED_QTY,
  currency: "PLN",
  lines: [{ price: UNIT_PRICE, qty: RESERVED_QTY, title: "Onyx earrings", variantId: VARIANT_ID }],
  locale: "pl",
  transactionId: TRANSACTION_ID,
}

const countOrders = (): number => z.object({ total: z.number() }).parse(sqlite.prepare(`select count(*) as total from "order"`).get()).total

const readCheckoutStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from checkout where id = ?`).get(CHECKOUT_ID)).status

const readReservedQuantity = (variantId: string): number =>
  z
    .object({ quantity_reserved: z.number() })
    .parse(sqlite.prepare(`select quantity_reserved from inventory where variant_id = ?`).get(variantId)).quantity_reserved

const readPaymentStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from payment where transaction_id = ?`).get(TRANSACTION_ID)).status

const readOrder = (orderId: string) =>
  z
    .object({
      checkout_id: z.string(),
      currency_code: z.string(),
      email: z.string(),
      id: z.string(),
      metadata: z.string().nullable(),
      payment_id: z.string(),
      shipping_total: z.number(),
      status: z.string(),
      subtotal: z.number(),
      total: z.number(),
      user_id: z.string().nullable(),
    })
    .parse(sqlite.prepare(`select * from "order" where id = ?`).get(orderId))

beforeEach(() => {
  queries.length = 0
  sqlite.exec(`
      drop table if exists "order";
      drop table if exists order_item;
      drop table if exists payment;
      drop table if exists checkout;
      drop table if exists inventory;

      create table checkout (id text primary key, status text not null, email text, user_id text, customer_note text, delivery_method_id text, locker_id text, created_at integer, updated_at integer);
      create table payment (id text primary key, checkout_id text, status text, transaction_id text unique, created_at integer, updated_at integer);
      create table "order" (
        id text primary key, checkout_id text unique, payment_id text, user_id text, email text not null,
        currency_code text not null default 'PLN', status text not null default 'pending',
        fulfillment_status text not null default 'not_fulfilled', subtotal integer not null default 0,
        shipping_total integer not null default 0, tax_total integer not null default 0,
        discount_total integer not null default 0, total integer not null default 0,
        customer_note text, delivery_method_id text, locker_id text, discount_id text, metadata text,
        tracking_number text, tracking_url text, canceled_at integer, delivered_at integer, shipped_at integer,
        created_at integer, updated_at integer
      );
      create table order_item (
        id text primary key, order_id text, variant_id text, product_id text, title text, variant_title text,
        thumbnail text, metadata text, quantity integer, unit_price integer, subtotal integer, total integer,
        created_at integer, updated_at integer
      );
      create table inventory (
        id text primary key, variant_id text, quantity_available integer, quantity_reserved integer,
        version integer, created_at integer, updated_at integer
      );

      insert into checkout (id, status, email) values ('${CHECKOUT_ID}', 'pending', 'buyer@example.com');
      insert into payment (id, checkout_id, status, transaction_id) values ('pay_1', '${CHECKOUT_ID}', 'pending', '${TRANSACTION_ID}');
      insert into inventory (id, variant_id, quantity_available, quantity_reserved, version)
        values ('inv_1', '${VARIANT_ID}', 8, ${RESERVED_QTY}, 1);
    `)
})

afterAll(() => {
  sqlite.close()
})

describe("resolvePendingCheckout", () => {
  it("returns the context while the checkout is still pending", () => {
    expect(resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)).toEqual({
      checkoutId: CHECKOUT_ID,
      email: "buyer@example.com",
      paymentId: "pay_1",
      userId: null,
    })
  })

  it("refuses a checkout that another delivery already completed", () => {
    expect(resolvePendingCheckout(paymentRow, { ...pendingCheckoutRow, status: "completed" }, TRANSACTION_ID)).toBeUndefined()
  })

  it("refuses when no payment row matches the transaction", () => {
    expect(resolvePendingCheckout(undefined, pendingCheckoutRow, TRANSACTION_ID)).toBeUndefined()
  })
})

describe("fulfilment input boundaries", () => {
  it("records an empty fulfillment without mutating order items or inventory", async () => {
    const context = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    if (context === undefined) {
      throw new Error("expected a pending checkout")
    }
    const inventoryBefore = sqlite.prepare("select * from inventory").all()
    const { orderId, statements } = prepareFulfillCheckoutBatch(context, { ...fulfillInput, amount: 0, lines: [] })

    await runDrizzleBatch(statements)

    expect(readPaymentStatus()).toBe("succeeded")
    expect(readCheckoutStatus()).toBe("completed")
    expect(countOrders()).toBe(1)
    expect(readOrder(orderId)).toStrictEqual({
      checkout_id: CHECKOUT_ID,
      currency_code: "PLN",
      email: "buyer@example.com",
      id: orderId,
      metadata: JSON.stringify({ locale: "pl" }),
      payment_id: "pay_1",
      shipping_total: 0,
      status: "processing",
      subtotal: 0,
      total: 0,
      user_id: null,
    })
    expect(sqlite.prepare("select * from order_item").all()).toStrictEqual([])
    expect(sqlite.prepare("select * from inventory").all()).toStrictEqual(inventoryBefore)
    expect(queries.filter((query) => /^(?:insert into|update|delete from) "(?:inventory|order_item)"/u.test(query.sql))).toStrictEqual([])
  })

  it.each([
    { label: "omitted", localeInput: {} },
    { label: "empty", localeInput: { locale: "" } },
  ])("fulfills the checkout without locale metadata when the locale is $label", async ({ localeInput }) => {
    const context = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    if (context === undefined) {
      throw new Error("expected a pending checkout")
    }
    const { locale: _locale, ...inputWithoutLocale } = fulfillInput
    const { orderId, statements } = prepareFulfillCheckoutBatch(context, { ...inputWithoutLocale, ...localeInput })

    await runDrizzleBatch(statements)

    expect(readPaymentStatus()).toBe("succeeded")
    expect(readCheckoutStatus()).toBe("completed")
    expect(countOrders()).toBe(1)
    expect(readOrder(orderId)).toStrictEqual({
      checkout_id: CHECKOUT_ID,
      currency_code: "PLN",
      email: "buyer@example.com",
      id: orderId,
      metadata: null,
      payment_id: "pay_1",
      shipping_total: 0,
      status: "processing",
      subtotal: UNIT_PRICE * RESERVED_QTY,
      total: UNIT_PRICE * RESERVED_QTY,
      user_id: null,
    })
    expect(sqlite.prepare("select order_id, variant_id, title, quantity, unit_price, subtotal, total from order_item").all()).toEqual([
      {
        order_id: orderId,
        quantity: RESERVED_QTY,
        subtotal: UNIT_PRICE * RESERVED_QTY,
        title: "Onyx earrings",
        total: UNIT_PRICE * RESERVED_QTY,
        unit_price: UNIT_PRICE,
        variant_id: VARIANT_ID,
      },
    ])
    expect(sqlite.prepare("select quantity_available, quantity_reserved from inventory where variant_id = ?").get(VARIANT_ID)).toEqual({
      quantity_available: 8,
      quantity_reserved: 0,
    })
  })
})

describe("fulfilment batch", () => {
  it("writes one order and completes the checkout", async () => {
    const context = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    expect(context).toBeDefined()
    if (context === undefined) {
      return
    }

    const { statements } = prepareFulfillCheckoutBatch(context, fulfillInput)
    await runDrizzleBatch(statements)

    expect(countOrders()).toBe(1)
    expect(readCheckoutStatus()).toBe("completed")
  })

  it("releases the reserved quantity for each fulfilled line", async () => {
    const context = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    if (context === undefined) {
      throw new Error("expected a pending checkout")
    }

    await runDrizzleBatch(prepareFulfillCheckoutBatch(context, fulfillInput).statements)

    expect(readReservedQuantity(VARIANT_ID)).toBe(0)
  })

  it("creates only one order when two deliveries both pass the pending guard", async () => {
    const first = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    const second = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    if (first === undefined || second === undefined) {
      throw new Error("expected both deliveries to observe a pending checkout")
    }

    await runDrizzleBatch(prepareFulfillCheckoutBatch(first, fulfillInput).statements)
    await expect(runDrizzleBatch(prepareFulfillCheckoutBatch(second, fulfillInput).statements)).rejects.toThrow()

    expect(countOrders()).toBe(1)
  })

  it("does not re-complete a checkout that is no longer pending", async () => {
    const context = resolvePendingCheckout(paymentRow, pendingCheckoutRow, TRANSACTION_ID)
    if (context === undefined) {
      throw new Error("expected a pending checkout")
    }
    sqlite.exec(`update checkout set status = 'cancelled' where id = '${CHECKOUT_ID}'`)

    await runDrizzleBatch(prepareFulfillCheckoutBatch(context, fulfillInput).statements.filter((_statement, index) => index !== 2))

    expect(readCheckoutStatus()).toBe("cancelled")
  })
})

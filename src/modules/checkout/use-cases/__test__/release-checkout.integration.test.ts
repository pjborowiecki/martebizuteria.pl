import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"

const AT = Date.UTC(2026, 0, 1)

const TRANSACTION_ID = "pi_live_1"

const inventoryRow = (variantId: string) => {
  const row = sqlite
    .prepare("select quantity_available as available, quantity_reserved as reserved from inventory where variant_id = ?")
    .get(variantId)

  return row
}

const statusOf = (table: "checkout" | "payment", column: "id" | "transaction_id", value: string) =>
  sqlite.prepare(`select status from ${table} where ${column} = ?`).get(value)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists inventory;
    drop table if exists payment;
    drop table if exists checkout;

    create table checkout (
      id text primary key, billing_company_name text, billing_nip text, email text not null, status text not null default 'pending', user_id text,
      billing_address_id text, cart_id text, customer_note text, delivery_method_id text, discount_id text,
      locker_id text, shipping_address_id text, created_at integer not null, updated_at integer not null
    );
    create table payment (
      id text primary key, amount integer not null, checkout_id text not null, currency text not null default 'PLN',
      provider text not null, refunded_amount integer not null default 0, refunded_at integer,
      status text not null default 'pending', transaction_id text, created_at integer not null, updated_at integer not null
    );
    create table inventory (
      id text primary key, quantity_available integer not null default 0, quantity_reserved integer not null default 0,
      variant_id text not null, version integer not null default 1, created_at integer not null, updated_at integer not null
    );

    insert into checkout (id, email, status, user_id, created_at, updated_at)
      values ('chk-1', 'anna@example.com', 'pending', 'user-1', ${AT}, ${AT}),
             ('chk-done', 'done@example.com', 'completed', null, ${AT}, ${AT});

    insert into payment (id, amount, checkout_id, provider, status, transaction_id, created_at, updated_at)
      values ('pay-1', 24900, 'chk-1', 'stripe', 'pending', '${TRANSACTION_ID}', ${AT}, ${AT}),
             ('pay-done', 24900, 'chk-done', 'stripe', 'pending', 'pi_done', ${AT}, ${AT}),
             ('pay-orphan', 24900, 'chk-missing', 'stripe', 'pending', 'pi_orphan', ${AT}, ${AT});

    insert into inventory (id, quantity_available, quantity_reserved, variant_id, version, created_at, updated_at)
      values ('inv-1', 5, 3, 'var-1', 1, ${AT}, ${AT}),
             ('inv-2', 0, 1, 'var-2', 1, ${AT}, ${AT});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("findPendingCheckoutByTransaction", () => {
  it("resolves the pending checkout behind a live payment", async () => {
    await expect(findPendingCheckoutByTransaction(TRANSACTION_ID)).resolves.toStrictEqual({
      checkoutId: "chk-1",
      email: "anna@example.com",
      paymentId: "pay-1",
      userId: "user-1",
    })
  })

  it("ignores a transaction that has no payment row", async () => {
    await expect(findPendingCheckoutByTransaction("pi_unknown")).resolves.toBeUndefined()
  })

  it("ignores a checkout that was already processed", async () => {
    await expect(findPendingCheckoutByTransaction("pi_done")).resolves.toBeUndefined()
  })

  it("ignores a payment whose checkout no longer exists", async () => {
    await expect(findPendingCheckoutByTransaction("pi_orphan")).resolves.toBeUndefined()
  })
})

describe("releaseCheckout", () => {
  it("fails the payment and the checkout and returns the reserved stock", async () => {
    await releaseCheckout({
      lines: [
        { qty: 2, variantId: "var-1" },
        { qty: 1, variantId: "var-2" },
      ],
      transactionId: TRANSACTION_ID,
    })

    expect(statusOf("payment", "transaction_id", TRANSACTION_ID)).toEqual({ status: "failed" })
    expect(statusOf("checkout", "id", "chk-1")).toEqual({ status: "failed" })
    expect(inventoryRow("var-1")).toEqual({ available: 7, reserved: 1 })
    expect(inventoryRow("var-2")).toEqual({ available: 1, reserved: 0 })
  })

  it("restores only the remaining reservation when the requested release is larger", async () => {
    await releaseCheckout({ lines: [{ qty: 9, variantId: "var-2" }], transactionId: TRANSACTION_ID })

    expect(inventoryRow("var-2")).toEqual({ available: 1, reserved: 0 })
  })

  it("does not release another reservation when the failed checkout is delivered again", async () => {
    const input = { lines: [{ qty: 2, variantId: "var-1" }], transactionId: TRANSACTION_ID }

    await releaseCheckout(input)
    await releaseCheckout(input)

    expect(statusOf("payment", "transaction_id", TRANSACTION_ID)).toEqual({ status: "failed" })
    expect(statusOf("checkout", "id", "chk-1")).toEqual({ status: "failed" })
    expect(inventoryRow("var-1")).toEqual({ available: 7, reserved: 1 })
  })

  it("leaves everything untouched for a transaction with no pending checkout", async () => {
    await releaseCheckout({ lines: [{ qty: 2, variantId: "var-1" }], transactionId: "pi_unknown" })

    expect(statusOf("payment", "transaction_id", TRANSACTION_ID)).toEqual({ status: "pending" })
    expect(statusOf("checkout", "id", "chk-1")).toEqual({ status: "pending" })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 3 })
  })

  it("still fails the payment and checkout when no lines were reserved", async () => {
    await releaseCheckout({ lines: [], transactionId: TRANSACTION_ID })

    expect(statusOf("payment", "transaction_id", TRANSACTION_ID)).toEqual({ status: "failed" })
    expect(statusOf("checkout", "id", "chk-1")).toEqual({ status: "failed" })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 3 })
  })
})

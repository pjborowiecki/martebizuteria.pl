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

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { prepareReleaseCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { supersedeCheckoutSession } from "~/src/modules/checkout/use-cases/supersede-checkout-session.server"

const AT = Date.UTC(2026, 0, 1)

const OLD_SESSION = "cs_old"

const NEW_SESSION = "cs_new"

const HELD_LINES = [
  { qty: 2, variantId: "var-1" },
  { qty: 1, variantId: "var-2" },
]

const RESERVED_LINES = [{ qty: 3, variantId: "var-1" }]

const continueAs = (userId: string | undefined, oldTransactionId: string, newTransactionId = NEW_SESSION) =>
  supersedeCheckoutSession({
    amount: 51_300,
    discountId: undefined,
    heldLines: HELD_LINES,
    newTransactionId,
    oldTransactionId,
    reservedLines: RESERVED_LINES,
    userId,
  })

const supersede = (oldTransactionId = OLD_SESSION, newTransactionId = NEW_SESSION) =>
  continueAs("user-1", oldTransactionId, newTransactionId)

const supersedeApplying = (discountId: string) =>
  supersedeCheckoutSession({
    amount: 51_300,
    discountId,
    heldLines: HELD_LINES,
    newTransactionId: NEW_SESSION,
    oldTransactionId: OLD_SESSION,
    reservedLines: RESERVED_LINES,
    userId: "user-1",
  })

const inventoryRow = (variantId: string) =>
  sqlite.prepare("select quantity_available as available, quantity_reserved as reserved from inventory where variant_id = ?").get(variantId)

const paymentRow = (paymentId: string) =>
  sqlite.prepare("select amount, status, transaction_id as transactionId from payment where id = ?").get(paymentId)

const checkoutStatus = (checkoutId: string) => sqlite.prepare("select status from checkout where id = ?").get(checkoutId)

const claimsOf = (checkoutId: string) =>
  sqlite.prepare("select discount_id as discountId from discount_claim where checkout_id = ? order by discount_id").all(checkoutId)

const checkoutOwner = (checkoutId: string) => sqlite.prepare("select user_id as userId from checkout where id = ?").get(checkoutId)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists inventory;
    drop table if exists payment;
    drop table if exists checkout;
    drop table if exists discount_claim;

    create table checkout (
      id text primary key, billing_company_name text, billing_nip text, email text not null, status text not null default 'pending', user_id text,
      billing_address_id text, cart_id text, client_address text, customer_note text, delivery_method_id text, discount_id text,
      locker_id text, locker_point text, shipping_address_id text, created_at integer not null, updated_at integer not null
    );
    create table payment (
      id text primary key, amount integer not null, checkout_id text not null, currency text not null default 'PLN',
      provider text not null, refunded_amount integer not null default 0, refunded_at integer, reserved_lines text not null default '[]',
      status text not null default 'pending', transaction_id text unique, created_at integer not null, updated_at integer not null
    );
    create table inventory (
      id text primary key, quantity_available integer not null default 0, quantity_reserved integer not null default 0,
      variant_id text not null unique, created_at integer not null, updated_at integer not null
    );

    insert into checkout (id, email, status, user_id, created_at, updated_at)
      values ('chk-1', 'anna@example.com', 'pending', 'user-1', ${AT}, ${AT}),
             ('chk-other', 'jan@example.com', 'pending', null, ${AT}, ${AT});

    insert into payment (id, amount, checkout_id, provider, status, transaction_id, created_at, updated_at)
      values ('pay-1', 49800, 'chk-1', 'stripe', 'pending', '${OLD_SESSION}', ${AT}, ${AT}),
             ('pay-other', 24900, 'chk-other', 'stripe', 'pending', 'cs_other', ${AT}, ${AT});

    create table discount_claim (
      id text primary key, checkout_id text not null, discount_id text not null, email text not null,
      created_at integer, updated_at integer
    );

    insert into inventory (id, quantity_available, quantity_reserved, variant_id, created_at, updated_at)
      values ('inv-1', 3, 4, 'var-1', ${AT}, ${AT}),
             ('inv-2', 0, 1, 'var-2', ${AT}, ${AT});

    insert into discount_claim (id, checkout_id, discount_id, email)
      values ('claim-spring', 'chk-1', 'disc-spring', 'anna@example.com'),
             ('claim-summer', 'chk-1', 'disc-summer', 'anna@example.com'),
             ('claim-other', 'chk-other', 'disc-spring', 'jan@example.com');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("supersedeCheckoutSession", () => {
  it("moves the pending payment onto the new session and returns the stock the old session held", async () => {
    await expect(supersede()).resolves.toBe(true)

    expect(paymentRow("pay-1")).toEqual({ amount: 51_300, status: "pending", transactionId: NEW_SESSION })
    expect(checkoutStatus("chk-1")).toEqual({ status: "pending" })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
    expect(inventoryRow("var-2")).toEqual({ available: 1, reserved: 0 })
  })

  it("records on the moved payment the lines the replacement session reserves", async () => {
    await supersede()

    expect(sqlite.prepare("select reserved_lines as reservedLines from payment where id = 'pay-1'").get()).toEqual({
      reservedLines: JSON.stringify(RESERVED_LINES),
    })
  })

  it("leaves other checkouts' payments alone", async () => {
    await supersede()

    expect(paymentRow("pay-other")).toEqual({ amount: 24_900, status: "pending", transactionId: "cs_other" })
  })

  it("still moves the payment when the old session held no lines", async () => {
    await expect(
      supersedeCheckoutSession({
        amount: 0,
        discountId: undefined,
        heldLines: [],
        newTransactionId: NEW_SESSION,
        oldTransactionId: OLD_SESSION,
        reservedLines: [],
        userId: "user-1",
      }),
    ).resolves.toBe(true)

    expect(paymentRow("pay-1")).toEqual({ amount: 0, status: "pending", transactionId: NEW_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 3, reserved: 4 })
  })

  it("releases the old lines only once when the same session is superseded twice", async () => {
    await expect(supersede(OLD_SESSION, NEW_SESSION)).resolves.toBe(true)
    await expect(supersede(OLD_SESSION, "cs_newer")).resolves.toBe(false)

    expect(paymentRow("pay-1")).toEqual({ amount: 51_300, status: "pending", transactionId: NEW_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
  })

  it.each([
    { checkout: "failed", payment: "failed" },
    { checkout: "completed", payment: "succeeded" },
    { checkout: "pending", payment: "failed" },
    { checkout: "failed", payment: "pending" },
  ])("refuses a $checkout checkout with a $payment payment and releases nothing", async ({ checkout, payment }) => {
    sqlite.exec(
      `update checkout set status = '${checkout}' where id = 'chk-1'; update payment set status = '${payment}' where id = 'pay-1'`,
    )

    await expect(supersede()).resolves.toBe(false)

    expect(paymentRow("pay-1")).toEqual({ amount: 49_800, status: payment, transactionId: OLD_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 3, reserved: 4 })
    expect(inventoryRow("var-2")).toEqual({ available: 0, reserved: 1 })
  })

  it("refuses a session that has no payment", async () => {
    await expect(supersede("cs_unknown")).resolves.toBe(false)

    expect(inventoryRow("var-1")).toEqual({ available: 3, reserved: 4 })
  })

  it("leaves nothing for the old session's expiry webhook to release once it has been superseded", async () => {
    await supersede()
    await releaseCheckout({ lines: HELD_LINES, transactionId: OLD_SESSION })

    expect(checkoutStatus("chk-1")).toEqual({ status: "pending" })
    expect(paymentRow("pay-1")).toEqual({ amount: 51_300, status: "pending", transactionId: NEW_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
  })

  it("leaves the stock as the expiry webhook released it when that webhook got there first", async () => {
    await releaseCheckout({ lines: HELD_LINES, transactionId: OLD_SESSION })

    await expect(supersede()).resolves.toBe(false)

    expect(checkoutStatus("chk-1")).toEqual({ status: "failed" })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
    expect(inventoryRow("var-2")).toEqual({ available: 1, reserved: 0 })
  })

  it("returns the old lines once when the expiry webhook's release was prepared before the supersede and runs after it", async () => {
    const expiryRelease = prepareReleaseCheckoutBatch({ lines: HELD_LINES, transactionId: OLD_SESSION })

    await expect(supersede()).resolves.toBe(true)
    await runDrizzleBatch(expiryRelease)

    expect(checkoutStatus("chk-1")).toEqual({ status: "pending" })
    expect(paymentRow("pay-1")).toEqual({ amount: 51_300, status: "pending", transactionId: NEW_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
    expect(inventoryRow("var-2")).toEqual({ available: 1, reserved: 0 })
  })

  it("gives a guest's checkout to the account that signed in and continued it", async () => {
    await expect(continueAs("user-2", "cs_other")).resolves.toBe(true)

    expect(checkoutOwner("chk-other")).toEqual({ userId: "user-2" })
    expect(checkoutOwner("chk-1")).toEqual({ userId: "user-1" })
  })

  it("keeps a guest's checkout without an owner while nobody is signed in", async () => {
    await expect(continueAs(undefined, "cs_other")).resolves.toBe(true)

    expect(checkoutOwner("chk-other")).toEqual({ userId: null })
  })

  it("never moves a checkout that already has an owner to another account", async () => {
    await expect(continueAs("user-2", OLD_SESSION)).resolves.toBe(true)

    expect(checkoutOwner("chk-1")).toEqual({ userId: "user-1" })
  })

  it("leaves a guest's checkout without an owner when its payment could not be moved", async () => {
    sqlite.exec("update checkout set status = 'failed' where id = 'chk-other'")

    await expect(continueAs("user-2", "cs_other")).resolves.toBe(false)

    expect(checkoutOwner("chk-other")).toEqual({ userId: null })
  })

  it("lets the replacement session return the edited cart's reservation after a late expiry release of the old one", async () => {
    const expiryRelease = prepareReleaseCheckoutBatch({ lines: HELD_LINES, transactionId: OLD_SESSION })
    await supersede()
    await runDrizzleBatch(expiryRelease)
    sqlite.exec(
      "update inventory set quantity_available = quantity_available - 3, quantity_reserved = quantity_reserved + 3 where id = 'inv-1'",
    )

    await releaseCheckout({ lines: [{ qty: 3, variantId: "var-1" }], transactionId: NEW_SESSION })

    expect(checkoutStatus("chk-1")).toEqual({ status: "failed" })
    expect(paymentRow("pay-1")).toEqual({ amount: 51_300, status: "failed", transactionId: NEW_SESSION })
    expect(inventoryRow("var-1")).toEqual({ available: 5, reserved: 2 })
  })
})

describe("supersedeCheckoutSession and the discount uses the checkout holds", () => {
  it("keeps the discount use the replacement session applies and gives back the rest of the checkout's", async () => {
    await supersedeApplying("disc-summer")

    expect(claimsOf("chk-1")).toEqual([{ discountId: "disc-summer" }])
    expect(claimsOf("chk-other")).toEqual([{ discountId: "disc-spring" }])
  })

  it("gives back every discount use of the checkout when the replacement session applies no code", async () => {
    await supersede()

    expect(claimsOf("chk-1")).toEqual([])
    expect(claimsOf("chk-other")).toEqual([{ discountId: "disc-spring" }])
  })

  it("keeps the old session's discount use when its payment could not be moved", async () => {
    sqlite.exec("update payment set status = 'failed' where id = 'pay-1'")

    await expect(supersedeApplying("disc-summer")).resolves.toBe(false)

    expect(claimsOf("chk-1")).toEqual([{ discountId: "disc-spring" }, { discountId: "disc-summer" }])
  })
})

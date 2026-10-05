import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { createPendingPayment, getHeldLinesByTransactionId, isAnyVariantHeldByOpenCheckout } =
  await import("~/src/modules/payment/payment.accessors")

const AT = Date.UTC(2026, 9, 5)

const HELD_LINES = [
  { qty: 1, variantId: "var-ring" },
  { qty: 2, variantId: "var-chain" },
]

const openCheckout = async (checkoutId: string, transactionId: string): Promise<void> => {
  sqlite
    .prepare("insert into checkout (id, email, status, created_at, updated_at) values (?, 'anna@example.com', 'pending', ?, ?)")
    .run(checkoutId, AT, AT)
  await createPendingPayment({
    amount: 99_800,
    checkoutId,
    currency: "PLN",
    provider: "stripe",
    reservedLines: HELD_LINES,
    transactionId,
  })
}

applyMigrationHistory(sqlite)

beforeEach(() => {
  sqlite.exec("delete from payment; delete from checkout;")
})

afterAll(() => {
  sqlite.close()
})

describe("getHeldLinesByTransactionId", () => {
  it("returns the lines an open checkout session holds", async () => {
    await openCheckout("chk-1", "cs_open")

    await expect(getHeldLinesByTransactionId("cs_open")).resolves.toStrictEqual(HELD_LINES)
  })

  it("holds nothing for a session id no payment carries", async () => {
    await openCheckout("chk-1", "cs_open")

    await expect(getHeldLinesByTransactionId("cs_unknown")).resolves.toStrictEqual([])
  })

  it.each([
    { checkout: "failed", payment: "failed" },
    { checkout: "completed", payment: "succeeded" },
    { checkout: "pending", payment: "failed" },
    { checkout: "failed", payment: "pending" },
  ])("holds nothing once a $checkout checkout has a $payment payment, as after release or fulfilment", async ({ checkout, payment }) => {
    await openCheckout("chk-1", "cs_closed")
    sqlite.prepare("update checkout set status = ? where id = 'chk-1'").run(checkout)
    sqlite.prepare("update payment set status = ? where transaction_id = 'cs_closed'").run(payment)

    await expect(getHeldLinesByTransactionId("cs_closed")).resolves.toStrictEqual([])
  })

  it("holds nothing for a payment written before reserved lines were recorded", async () => {
    sqlite.exec(`
      insert into checkout (id, email, status, created_at, updated_at) values ('chk-legacy', 'jan@example.com', 'pending', ${AT}, ${AT});
      insert into payment (id, amount, checkout_id, provider, status, transaction_id, created_at, updated_at)
        values ('pay-legacy', 24900, 'chk-legacy', 'stripe', 'pending', 'cs_legacy', ${AT}, ${AT});
    `)

    await expect(getHeldLinesByTransactionId("cs_legacy")).resolves.toStrictEqual([])
  })
})

describe("isAnyVariantHeldByOpenCheckout", () => {
  it("finds a variant that a checkout the customer can still pay holds", async () => {
    await openCheckout("chk-1", "cs_open")

    await expect(isAnyVariantHeldByOpenCheckout(["var-other", "var-chain"])).resolves.toBe(true)
  })

  it("finds nothing for variants no open checkout holds", async () => {
    await openCheckout("chk-1", "cs_open")

    await expect(isAnyVariantHeldByOpenCheckout(["var-other"])).resolves.toBe(false)
    await expect(isAnyVariantHeldByOpenCheckout([])).resolves.toBe(false)
  })

  it.each([
    { checkout: "failed", payment: "failed" },
    { checkout: "completed", payment: "succeeded" },
    { checkout: "pending", payment: "failed" },
    { checkout: "failed", payment: "pending" },
  ])("lets go of the lines once a $checkout checkout has a $payment payment", async ({ checkout, payment }) => {
    await openCheckout("chk-1", "cs_closed")
    sqlite.prepare("update checkout set status = ? where id = 'chk-1'").run(checkout)
    sqlite.prepare("update payment set status = ? where transaction_id = 'cs_closed'").run(payment)

    await expect(isAnyVariantHeldByOpenCheckout(["var-ring", "var-chain"])).resolves.toBe(false)
  })
})

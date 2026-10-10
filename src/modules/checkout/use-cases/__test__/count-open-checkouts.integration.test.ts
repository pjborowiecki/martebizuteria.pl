import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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
const { CHECKOUT_SESSION_LIFETIME_SECONDS } = await import("~/src/integrations/stripe/stripe.constants")
const { countOpenCheckouts } = await import("~/src/modules/checkout/use-cases/count-open-checkouts.server")

const NOW = Date.UTC(2026, 9, 10, 12)

const MINUTE_MS = 60_000

const SESSION_LIFETIME_MS = CHECKOUT_SESSION_LIFETIME_SECONDS * 1000

const VISITOR = { clientAddress: "203.0.113.7", email: "anna@example.com" }

interface CheckoutFixture {
  readonly checkoutStatus?: string
  readonly clientAddress: string | null
  readonly email: string
  readonly id: string
  readonly paymentStatus?: string | null
  readonly sessionOpenedAt?: number
}

const insertCheckout = ({
  checkoutStatus = "pending",
  clientAddress,
  email,
  id,
  paymentStatus = "pending",
  sessionOpenedAt = NOW - MINUTE_MS,
}: CheckoutFixture): void => {
  sqlite
    .prepare("insert into checkout (id, client_address, email, status, created_at, updated_at) values (?, ?, ?, ?, ?, ?)")
    .run(id, clientAddress, email, checkoutStatus, sessionOpenedAt, sessionOpenedAt)
  if (paymentStatus !== null) {
    sqlite
      .prepare(
        "insert into payment (id, amount, checkout_id, provider, status, transaction_id, created_at, updated_at) values (?, 24900, ?, 'stripe', ?, ?, ?, ?)",
      )
      .run(`pay-${id}`, id, paymentStatus, `cs_${id}`, sessionOpenedAt, sessionOpenedAt)
  }
}

applyMigrationHistory(sqlite)

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  sqlite.exec("delete from payment; delete from checkout;")
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(() => {
  sqlite.close()
})

describe("countOpenCheckouts", () => {
  it("counts the open checkouts from the visitor's address and those for their email apart", async () => {
    insertCheckout({ clientAddress: VISITOR.clientAddress, email: "first@example.com", id: "chk-1" })
    insertCheckout({ clientAddress: VISITOR.clientAddress, email: "second@example.com", id: "chk-2" })
    insertCheckout({ clientAddress: "198.51.100.4", email: VISITOR.email, id: "chk-3" })
    insertCheckout({ clientAddress: "198.51.100.4", email: "someone@example.com", id: "chk-4" })

    await expect(countOpenCheckouts(VISITOR)).resolves.toStrictEqual({ byClientAddress: 2, byEmail: 1 })
  })

  it("matches the email whatever its letter case", async () => {
    insertCheckout({ clientAddress: null, email: "Anna@Example.com", id: "chk-1" })

    await expect(countOpenCheckouts({ ...VISITOR, email: "ANNA@example.com" })).resolves.toStrictEqual({ byClientAddress: 0, byEmail: 1 })
  })

  it.each([
    { checkoutStatus: "completed", label: "a paid checkout", paymentStatus: "succeeded" },
    { checkoutStatus: "failed", label: "a released checkout", paymentStatus: "failed" },
    { checkoutStatus: "pending", label: "a checkout whose payment failed", paymentStatus: "failed" },
    { checkoutStatus: "pending", label: "a checkout Stripe never opened a session for", paymentStatus: null },
  ])("leaves out $label", async ({ checkoutStatus, paymentStatus }) => {
    insertCheckout({ checkoutStatus, clientAddress: VISITOR.clientAddress, email: VISITOR.email, id: "chk-1", paymentStatus })

    await expect(countOpenCheckouts(VISITOR)).resolves.toStrictEqual({ byClientAddress: 0, byEmail: 0 })
  })

  it("leaves out a checkout whose latest session has outlived the hold, even before its expiry webhook arrives", async () => {
    insertCheckout({ clientAddress: VISITOR.clientAddress, email: VISITOR.email, id: "chk-1", sessionOpenedAt: NOW - SESSION_LIFETIME_MS })
    insertCheckout({
      clientAddress: VISITOR.clientAddress,
      email: VISITOR.email,
      id: "chk-2",
      sessionOpenedAt: NOW - SESSION_LIFETIME_MS + 1,
    })

    await expect(countOpenCheckouts(VISITOR)).resolves.toStrictEqual({ byClientAddress: 1, byEmail: 1 })
  })

  it("counts a checkout opened long ago whose session the shopper replaced within the hold", async () => {
    insertCheckout({
      clientAddress: VISITOR.clientAddress,
      email: VISITOR.email,
      id: "chk-1",
      sessionOpenedAt: NOW - 3 * SESSION_LIFETIME_MS,
    })
    sqlite.prepare("update payment set updated_at = ? where checkout_id = 'chk-1'").run(NOW - MINUTE_MS)

    await expect(countOpenCheckouts(VISITOR)).resolves.toStrictEqual({ byClientAddress: 1, byEmail: 1 })
  })
})

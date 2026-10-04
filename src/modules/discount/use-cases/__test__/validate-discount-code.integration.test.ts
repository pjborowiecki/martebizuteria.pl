import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"

const { roundTrips, sqlite, stubs } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    roundTrips: [] as TestD1RoundTrip[],
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stubs: { getRequestSession: vi.fn<() => Promise<{ user: { email: string } } | null>>() },
  }
})

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

  return { ...actual, getRequest: () => new Request("https://marte.test/checkout") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        roundTrips.push(trip)
      }),
      { schema },
    ),
  }
})

const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { DISCOUNT_REJECTION, DISCOUNT_TYPE } = await import("~/src/modules/discount/discount.constants")
const { validateDiscountCode } = await import("~/src/modules/discount/use-cases/validate-discount-code")

const NOW = Date.UTC(2026, 5, 1, 12)

const BASKET = { itemsSubtotal: 20_000, shippingTotal: 1500 }

const ONCE_PER_CUSTOMER = {
  applied: { amountMinorUnits: 3000, code: "ONCE-24", discountId: "discount-once", type: DISCOUNT_TYPE.PERCENTAGE },
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite
    .prepare(
      `insert into discount (id, code, is_active, per_customer_limit, type, usage_count, value, created_at, updated_at)
       values ('discount-once', 'ONCE-24', 1, 1, 'percentage', 1, 15, ?, ?)`,
    )
    .run(NOW, NOW)
  sqlite
    .prepare(
      `insert into discount_redemption (id, discount_id, email, amount, created_at, updated_at)
       values ('redemption-1', 'discount-once', 'ADA@Marte.test', 3000, ?, ?)`,
    )
    .run(NOW, NOW)
})

beforeEach(() => {
  roundTrips.length = 0
  stubs.getRequestSession.mockReset()
  stubs.getRequestSession.mockResolvedValue(null)
})

afterAll(() => {
  sqlite.close()
})

describe("validateDiscountCode against the database", () => {
  it("checks a code against the typed email's redemptions in one round trip, without the session", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "once-24", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.ALREADY_USED,
    })
    expect(roundTrips).toStrictEqual([{ kind: "statement", sql: [expect.stringContaining("discount_redemption")] }])
    expect(stubs.getRequestSession).not.toHaveBeenCalled()
  })

  it("lets an email that never used the code have it", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "ONCE-24", email: "grace@marte.test" } })).resolves.toStrictEqual(
      ONCE_PER_CUSTOMER,
    )
  })

  it("counts the signed-in account's redemptions when no email was typed", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "Ada@marte.test" } })

    await expect(validateDiscountCode({ data: { ...BASKET, code: "ONCE-24" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.ALREADY_USED,
    })
    expect(roundTrips).toHaveLength(1)
  })

  it("checks a guest with no email against no one", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "ONCE-24", email: "" } })).resolves.toStrictEqual(ONCE_PER_CUSTOMER)
  })

  it("says an unknown code was not found in one round trip", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "NOPE-99", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_FOUND,
    })
    expect(roundTrips).toHaveLength(1)
  })
})

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
const { ERROR_CODES } = await import("~/src/modules/_core/constants/errors")
const { DISCOUNT_REJECTION, DISCOUNT_TYPE } = await import("~/src/modules/discount/discount.constants")
const { validateDiscountCode } = await import("~/src/modules/discount/use-cases/validate-discount-code")

const NOW = Date.UTC(2026, 5, 1, 12)

const BASKET = {
  lines: [
    { qty: 2, variantId: "variant-ring" },
    { qty: 1, variantId: "variant-chain" },
  ],
}

const CHECKOUT_RATE_LIMIT = 10

const RATE_LIMIT_ROUND_TRIP = { kind: "statement", sql: [expect.stringContaining("rate_limit")] }

const DISCOUNT_ROUND_TRIP = { kind: "statement", sql: [expect.stringContaining("discount_claim")] }

const SELL_PRICES_ROUND_TRIP = { kind: "statement", sql: [expect.stringContaining("product_variant")] }

const ONCE_PER_CUSTOMER = {
  applied: { amountMinorUnits: 3000, code: "ONCE-24", discountId: "discount-once", type: DISCOUNT_TYPE.PERCENTAGE },
}

const openCheckoutHolding = (checkoutId: string, email: string, discountId: string): void => {
  sqlite.exec(`
    insert into checkout (id, email, status, discount_id, created_at, updated_at) values ('${checkoutId}', '${email}', 'pending', '${discountId}', ${NOW}, ${NOW});
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, created_at, updated_at)
      values ('payment-${checkoutId}', '${checkoutId}', 17000, 'stripe', 'pending', 'cs_${checkoutId}', ${NOW}, ${NOW});
    insert into discount_claim (id, checkout_id, discount_id, email, created_at, updated_at)
      values ('claim-${checkoutId}', '${checkoutId}', '${discountId}', '${email}', ${NOW}, ${NOW});
  `)
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
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-aura', 'aura', 'published', '{"en-US":"Aura"}');
    insert into product_variant (id, product_id, title, price) values
      ('variant-ring', 'product-aura', 'Ring', 8000),
      ('variant-chain', 'product-aura', 'Chain', 4000);
    insert into courier (id, internal_code, is_active, name, created_at, updated_at) values ('courier-inpost', 'inpost', 1, 'InPost', ${NOW}, ${NOW});
    insert into delivery_method (id, api_service_code, courier_id, is_active, name, price, type, created_at, updated_at) values
      ('dm-courier', 'inpost_courier', 'courier-inpost', 1, 'InPost courier', 1990, 'courier', ${NOW}, ${NOW}),
      ('dm-retired', 'inpost_retired', 'courier-inpost', 0, 'Retired courier', 990, 'courier', ${NOW}, ${NOW});
  `)
})

beforeEach(() => {
  sqlite.exec(`
    delete from rate_limit;
    delete from discount_claim;
    delete from payment;
    delete from checkout;
    delete from discount where id <> 'discount-once';
  `)
  roundTrips.length = 0
  stubs.getRequestSession.mockReset()
  stubs.getRequestSession.mockResolvedValue(null)
})

afterAll(() => {
  sqlite.close()
})

describe("validateDiscountCode against the database", () => {
  it("reads the code with the typed email's redemptions beside the basket's prices after the rate count, without the session", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "once-24", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.ALREADY_USED,
    })
    expect(roundTrips).toHaveLength(3)
    expect(roundTrips).toStrictEqual(expect.arrayContaining([RATE_LIMIT_ROUND_TRIP, DISCOUNT_ROUND_TRIP, SELL_PRICES_ROUND_TRIP]))
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
    expect(roundTrips).toHaveLength(3)
  })

  it("checks a guest with no email against no one", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "ONCE-24", email: "" } })).resolves.toStrictEqual(ONCE_PER_CUSTOMER)
  })

  it("says an unknown code was not found after reading the code and the prices once", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "NOPE-99", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_FOUND,
    })
    expect(roundTrips).toHaveLength(3)
    expect(roundTrips).toStrictEqual(expect.arrayContaining([RATE_LIMIT_ROUND_TRIP, DISCOUNT_ROUND_TRIP, SELL_PRICES_ROUND_TRIP]))
  })

  it("refuses an address that checks codes more often than the checkout rate allows", async () => {
    const answers = await Promise.allSettled(
      Array.from({ length: CHECKOUT_RATE_LIMIT + 1 }, () =>
        validateDiscountCode({ data: { ...BASKET, code: "NOPE-99", email: "ada@marte.test" } }),
      ),
    )

    expect(answers.filter((answer) => answer.status === "fulfilled")).toHaveLength(CHECKOUT_RATE_LIMIT)
    expect(answers.find((answer) => answer.status === "rejected")?.reason).toMatchObject({ code: ERROR_CODES.TOO_MANY_REQUESTS })
  })
})

const addDiscount = (columns: string): void => {
  sqlite.exec(`
    insert into discount (id, code, is_active, type, value, usage_count, usage_limit, per_customer_limit, min_order_total, created_at, updated_at)
    values (${columns}, ${NOW}, ${NOW})
  `)
}

describe("validateDiscountCode prices the basket from the shop", () => {
  it("takes a percentage of the subtotal at the shop's prices", async () => {
    addDiscount("'discount-tenth', 'TENTH', 1, 'percentage', 10, 0, null, null, null")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "TENTH" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 2000 },
    })
  })

  it("holds the minimum order against the subtotal at the shop's prices", async () => {
    addDiscount("'discount-big', 'BIG-BASKET', 1, 'percentage', 10, 0, null, null, 20001")
    addDiscount("'discount-exact', 'EXACT-BASKET', 1, 'percentage', 10, 0, null, null, 20000")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "BIG-BASKET" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.MIN_ORDER_NOT_MET,
    })
    await expect(validateDiscountCode({ data: { ...BASKET, code: "EXACT-BASKET" } })).resolves.toMatchObject({
      applied: { code: "EXACT-BASKET" },
    })
  })

  it("prices free delivery at the offered method's cost in one more round trip", async () => {
    addDiscount("'discount-ship', 'SHIP-FREE', 1, 'free_shipping', 0, 0, null, null, null")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SHIP-FREE", deliveryMethodId: "dm-courier" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 1990, type: DISCOUNT_TYPE.FREE_SHIPPING },
    })
    expect(roundTrips).toHaveLength(4)
    expect(roundTrips.at(-1)).toStrictEqual({ kind: "statement", sql: [expect.stringContaining("delivery_method")] })
  })

  it("takes nothing off for a delivery method the shop has retired", async () => {
    addDiscount("'discount-ship', 'SHIP-FREE', 1, 'free_shipping', 0, 0, null, null, null")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SHIP-FREE", deliveryMethodId: "dm-retired" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 0 },
    })
  })

  it("does not read the delivery method for a code that does not take delivery off", async () => {
    addDiscount("'discount-tenth', 'TENTH', 1, 'percentage', 10, 0, null, null, null")

    await validateDiscountCode({ data: { ...BASKET, code: "TENTH", deliveryMethodId: "dm-courier" } })

    expect(roundTrips).toHaveLength(3)
  })
})

describe("validateDiscountCode counts the uses open checkouts hold", () => {
  it("turns down a code whose last use another checkout holds", async () => {
    addDiscount("'discount-last', 'LAST-ONE', 1, 'percentage', 10, 2, 3, null, null")
    openCheckoutHolding("chk-grace", "grace@marte.test", "discount-last")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "LAST-ONE", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.HELD,
    })
  })

  it("still applies a code with a use left beside the ones held", async () => {
    addDiscount("'discount-last', 'LAST-ONE', 1, 'percentage', 10, 1, 3, null, null")
    openCheckoutHolding("chk-grace", "grace@marte.test", "discount-last")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "LAST-ONE" } })).resolves.toMatchObject({ applied: { code: "LAST-ONE" } })
  })

  it("does not count the use the shopper's own open checkout holds", async () => {
    addDiscount("'discount-last', 'LAST-ONE', 1, 'percentage', 10, 2, 3, null, null")
    openCheckoutHolding("chk-ada", "ada@marte.test", "discount-last")

    await expect(
      validateDiscountCode({ data: { ...BASKET, code: "LAST-ONE", email: "ada@marte.test", heldSessionId: "cs_chk-ada" } }),
    ).resolves.toMatchObject({ applied: { code: "LAST-ONE" } })
  })

  it("counts every hold when the shopper's stored session belongs to no checkout", async () => {
    addDiscount("'discount-last', 'LAST-ONE', 1, 'percentage', 10, 2, 3, null, null")
    openCheckoutHolding("chk-grace", "grace@marte.test", "discount-last")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "LAST-ONE", heldSessionId: "cs_unknown" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.HELD,
    })
  })

  it("turns down a once-per-customer code another checkout holds for the same email, whatever its case", async () => {
    addDiscount("'discount-single', 'SINGLE', 1, 'percentage', 10, 0, null, 1, null")
    openCheckoutHolding("chk-grace", "Grace@Marte.test", "discount-single")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SINGLE", email: "grace@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.HELD,
    })
    await expect(validateDiscountCode({ data: { ...BASKET, code: "SINGLE", email: "linus@marte.test" } })).resolves.toMatchObject({
      applied: { code: "SINGLE" },
    })
  })

  it("counts no customer's holds for a guest without an email", async () => {
    addDiscount("'discount-single', 'SINGLE', 1, 'percentage', 10, 0, null, 1, null")
    openCheckoutHolding("chk-grace", "grace@marte.test", "discount-single")

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SINGLE" } })).resolves.toMatchObject({ applied: { code: "SINGLE" } })
  })
})

import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

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
const { getDiscountByCodeForPreviewQuery } = await import("~/src/modules/discount/discount.accessors")
const { DISCOUNT_TYPE } = await import("~/src/modules/discount/discount.constants")
const { claimCheckoutDiscount, keepClaimedDiscount, prepareDiscountClaim, releaseDiscountClaims, releaseUnappliedDiscountClaims } =
  await import("~/src/modules/discount/discount.claim.server")

const AT = Date.UTC(2026, 9, 5)

const LAST_USE = { amountMinorUnits: 2490, code: "LAST-ONE", discountId: "disc-last", type: DISCOUNT_TYPE.PERCENTAGE }

const claimRowSchema = z.array(z.object({ checkout_id: z.string(), discount_id: z.string(), email: z.string() }))

const readClaims = () =>
  claimRowSchema.parse(sqlite.prepare("select checkout_id, discount_id, email from discount_claim order by checkout_id, discount_id").all())

const claim = async (checkoutId: string, discountId: string, email = "ada@marte.test"): Promise<boolean> => {
  const claims = await prepareDiscountClaim({ checkoutId, discountId, email, userId: undefined })

  return claims.length > 0
}

const claimSignedIn = async (checkoutId: string, { email, userId }: Readonly<{ email: string; userId: string }>): Promise<boolean> => {
  const claims = await prepareDiscountClaim({ checkoutId, discountId: "disc-once", email, userId })

  return claims.length > 0
}

const openCheckout = (checkoutId: string, email: string, discountId: string | null = null): void => {
  sqlite
    .prepare("insert into checkout (id, email, status, discount_id, created_at, updated_at) values (?, ?, 'pending', ?, ?, ?)")
    .run(checkoutId, email, discountId, AT, AT)
}

applyMigrationHistory(sqlite)

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {})
  sqlite.exec(`
    delete from discount_claim;
    delete from discount_redemption;
    delete from checkout;
    delete from discount;
    insert into discount (id, code, type, value, usage_count, usage_limit, per_customer_limit, created_at, updated_at) values
      ('disc-last', 'LAST-ONE', 'percentage', 10, 2, 3, null, ${AT}, ${AT}),
      ('disc-once', 'ONCE', 'percentage', 15, 0, null, 1, ${AT}, ${AT}),
      ('disc-open', 'OPEN', 'fixed_amount', 1000, 40, null, null, ${AT}, ${AT});
  `)
  openCheckout("chk-ada", "ada@marte.test")
  openCheckout("chk-grace", "grace@marte.test")
  openCheckout("chk-ada-again", "ADA@Marte.test")
})

afterAll(() => {
  sqlite.close()
})

describe("prepareDiscountClaim against the usage limit", () => {
  it("claims the last use for the first checkout and refuses it to the next while the first holds it", async () => {
    await expect(claim("chk-ada", "disc-last")).resolves.toBe(true)
    await expect(claim("chk-grace", "disc-last", "grace@marte.test")).resolves.toBe(false)

    expect(readClaims()).toStrictEqual([{ checkout_id: "chk-ada", discount_id: "disc-last", email: "ada@marte.test" }])
  })

  it("lets exactly one of two checkouts racing for the last use claim it", async () => {
    const claimed = await Promise.all([claim("chk-ada", "disc-last"), claim("chk-grace", "disc-last", "grace@marte.test")])

    expect(claimed.filter(Boolean)).toHaveLength(1)
    expect(readClaims()).toHaveLength(1)
  })

  it("refuses a use once every one is redeemed, whoever asks", async () => {
    sqlite.exec("update discount set usage_count = 3 where id = 'disc-last'")

    await expect(claim("chk-ada", "disc-last")).resolves.toBe(false)
    expect(readClaims()).toStrictEqual([])
  })

  it("lets a checkout claim the use it already holds again, without counting its own hold against it", async () => {
    await claim("chk-ada", "disc-last")

    await expect(claim("chk-ada", "disc-last")).resolves.toBe(true)
    expect(readClaims()).toHaveLength(1)
  })

  it("moves the hold to the address the checkout now uses when it claims again", async () => {
    await claim("chk-ada", "disc-last")

    await claim("chk-ada", "disc-last", "ada.lovelace@marte.test")

    expect(readClaims()).toStrictEqual([{ checkout_id: "chk-ada", discount_id: "disc-last", email: "ada.lovelace@marte.test" }])
  })

  it("gives the use to the next checkout once the holder lets it go", async () => {
    await claim("chk-ada", "disc-last")
    await releaseDiscountClaims("chk-ada")

    await expect(claim("chk-grace", "disc-last", "grace@marte.test")).resolves.toBe(true)
  })

  it("lets every checkout claim a code without limits", async () => {
    await expect(Promise.all([claim("chk-ada", "disc-open"), claim("chk-grace", "disc-open", "grace@marte.test")])).resolves.toStrictEqual([
      true,
      true,
    ])
  })

  it("claims nothing for a code that no longer exists", async () => {
    await expect(claim("chk-ada", "disc-deleted")).resolves.toBe(false)
  })
})

describe("prepareDiscountClaim against the per-customer limit", () => {
  it("refuses a second checkout of the same e-mail, whatever its case, while the first holds the code", async () => {
    await expect(claim("chk-ada", "disc-once")).resolves.toBe(true)
    await expect(claim("chk-ada-again", "disc-once", "ADA@Marte.test")).resolves.toBe(false)
  })

  it("lets another e-mail claim the code a customer holds", async () => {
    await claim("chk-ada", "disc-once")

    await expect(claim("chk-grace", "disc-once", "grace@marte.test")).resolves.toBe(true)
  })

  it("counts the customer's earlier redemptions", async () => {
    sqlite.exec(`
      insert into discount_redemption (id, discount_id, email, amount, created_at, updated_at)
        values ('redemption-1', 'disc-once', 'Ada@marte.test', 3000, ${AT}, ${AT})
    `)

    await expect(claim("chk-ada", "disc-once", " ada@marte.test ")).resolves.toBe(false)
    await expect(claim("chk-grace", "disc-once", "grace@marte.test")).resolves.toBe(true)
  })
})

describe("prepareDiscountClaim for a customer who changed their address", () => {
  beforeEach(() => {
    sqlite.exec(`
      delete from user;
      insert into user (id, name, email, created_at, updated_at) values ('user-ada', 'Ada', 'ada@new.example', 0, 0);
      update checkout set user_id = 'user-ada' where id = 'chk-ada';
    `)
  })

  it("counts what the account redeemed under its old address, signed in with any address or as a guest with its new one", async () => {
    sqlite.exec(`
      insert into discount_redemption (id, discount_id, email, user_id, amount, created_at, updated_at)
        values ('redemption-1', 'disc-once', 'ada@marte.test', 'user-ada', 3000, ${AT}, ${AT})
    `)

    await expect(claimSignedIn("chk-ada-again", { email: "ada@third.example", userId: "user-ada" })).resolves.toBe(false)
    await expect(claim("chk-grace", "disc-once", "Ada@New.example")).resolves.toBe(false)
    await expect(claim("chk-grace", "disc-once", "grace@marte.test")).resolves.toBe(true)
  })

  it("counts a use another of the account's checkouts holds under a different address", async () => {
    await claim("chk-ada", "disc-once", "ada@marte.test")

    await expect(claimSignedIn("chk-ada-again", { email: "ada@new.example", userId: "user-ada" })).resolves.toBe(false)
  })

  it("shows the signed-in account the use its checkouts hold before an address is typed", async () => {
    await claim("chk-ada", "disc-once", "ada@marte.test")

    await expect(
      getDiscountByCodeForPreviewQuery({ code: "ONCE", customer: { email: undefined, userId: "user-ada" }, heldSessionId: undefined }),
    ).resolves.toMatchObject({ heldForCustomer: 1, redeemedByCustomer: 0 })
  })
})

describe("claimCheckoutDiscount", () => {
  it("keeps the discount it claimed for the checkout", async () => {
    await expect(
      claimCheckoutDiscount({ applied: LAST_USE, checkoutId: "chk-ada", email: "ada@marte.test", userId: undefined }),
    ).resolves.toStrictEqual(LAST_USE)
    expect(readClaims()).toHaveLength(1)
  })

  it("drops a discount another checkout holds, and says why", async () => {
    await claim("chk-grace", "disc-last", "grace@marte.test")

    await expect(
      claimCheckoutDiscount({ applied: LAST_USE, checkoutId: "chk-ada", email: "ada@marte.test", userId: undefined }),
    ).resolves.toBeUndefined()
    expect(console.info).toHaveBeenCalledWith("Discount LAST-ONE not applied to checkout: other checkouts hold the uses its limits allow.")
  })

  it("claims nothing when no discount applies", async () => {
    await expect(
      claimCheckoutDiscount({ applied: undefined, checkoutId: "chk-ada", email: "ada@marte.test", userId: undefined }),
    ).resolves.toBeUndefined()
    expect(readClaims()).toStrictEqual([])
  })
})

describe("keepClaimedDiscount", () => {
  it("keeps a claimed discount and the absence of one without a word", () => {
    expect(keepClaimedDiscount(LAST_USE, true)).toStrictEqual(LAST_USE)
    expect(keepClaimedDiscount(undefined, false)).toBeUndefined()
    expect(console.info).not.toHaveBeenCalled()
  })
})

describe("releasing claims", () => {
  beforeEach(async () => {
    await claim("chk-ada", "disc-last")
    await claim("chk-ada", "disc-open")
    await claim("chk-grace", "disc-open", "grace@marte.test")
  })

  it("lets go of every claim of one checkout and only of that one", async () => {
    await releaseDiscountClaims("chk-ada")

    expect(readClaims()).toStrictEqual([{ checkout_id: "chk-grace", discount_id: "disc-open", email: "grace@marte.test" }])
  })

  it("keeps the claim of the code the checkout applies and lets go of the rest", async () => {
    sqlite.exec("update checkout set discount_id = 'disc-open' where id = 'chk-ada'")

    await releaseUnappliedDiscountClaims("chk-ada")

    expect(readClaims()).toStrictEqual([
      { checkout_id: "chk-ada", discount_id: "disc-open", email: "ada@marte.test" },
      { checkout_id: "chk-grace", discount_id: "disc-open", email: "grace@marte.test" },
    ])
  })

  it("lets go of every claim of a checkout that applies no code", async () => {
    await releaseUnappliedDiscountClaims("chk-ada")

    expect(readClaims()).toStrictEqual([{ checkout_id: "chk-grace", discount_id: "disc-open", email: "grace@marte.test" }])
  })
})

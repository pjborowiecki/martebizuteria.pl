import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { queries, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { queries: [] as string[], sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, ({ sql }) => {
        queries.push(sql)
      }),
      { schema },
    ),
  }
})

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  countCustomerRedemptions,
  deleteDiscountsByIds,
  getAdminDiscountStats,
  getAdminDiscountsPage,
  getDiscountByCode,
  getDiscountById,
  insertDiscount,
  updateDiscountById,
} from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { toDiscountUpdateValues } from "~/src/modules/discount/discount.persist.utils"

const NOW = Date.UTC(2026, 5, 1, 12)

const DAY_MS = 86_400_000

interface DiscountSeed {
  readonly code: string
  readonly createdAt?: number
  readonly description?: string | null
  readonly endsAt?: number | null
  readonly id: string
  readonly isActive?: boolean
  readonly startsAt?: number | null
  readonly usageCount?: number
  readonly usageLimit?: number | null
}

const seedDiscount = ({
  code,
  createdAt = NOW,
  description = null,
  endsAt = null,
  id,
  isActive = true,
  startsAt = null,
  usageCount = 0,
  usageLimit = null,
}: DiscountSeed): void => {
  sqlite
    .prepare(
      `insert into discount (id, code, description, ends_at, is_active, starts_at, type, usage_count, usage_limit, value, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, 'percentage', ?, ?, 15, ?, ?)`,
    )
    .run(id, code, description, endsAt, isActive ? 1 : 0, startsAt, usageCount, usageLimit, createdAt, createdAt)
}

interface RedemptionSeed {
  readonly amount: number
  readonly discountId: string
  readonly email: string
  readonly id: string
}

const seedRedemption = ({ amount, discountId, email, id }: RedemptionSeed): void => {
  sqlite
    .prepare(
      `insert into discount_redemption (id, discount_id, order_id, user_id, email, amount, created_at, updated_at)
       values (?, ?, ?, null, ?, ?, ?, ?)`,
    )
    .run(id, discountId, `order-${id}`, email, amount, NOW, NOW)
}

const storedRow = (id: string) => sqlite.prepare(`select * from discount where id = ?`).get(id)

const answerWithNoRows = (): void => {
  const prepare = sqlite.prepare.bind(sqlite)
  vi.spyOn(sqlite, "prepare").mockImplementation((sql) => {
    const statement = prepare(sql)
    vi.spyOn(statement, "all").mockReturnValue([])

    return statement
  })
}

beforeEach(() => {
  queries.length = 0
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  sqlite.exec(`
    drop table if exists discount_redemption;
    drop table if exists discount;
    create table discount (
      id text primary key, code text not null unique, description text, ends_at integer, is_active integer not null default 1,
      max_discount_amount integer, min_order_total integer, per_customer_limit integer, starts_at integer, type text not null,
      usage_count integer not null default 0, usage_limit integer, value integer not null,
      created_at integer not null, updated_at integer not null
    );
    create table discount_redemption (
      id text primary key, discount_id text not null references discount(id) on delete cascade, order_id text, user_id text,
      email text not null, amount integer not null, created_at integer not null, updated_at integer not null
    );
  `)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("getDiscountByCode and getDiscountById", () => {
  beforeEach(() => {
    seedDiscount({ code: "SPRING-24", description: "Spring sale", endsAt: NOW + DAY_MS, id: "discount-1", usageLimit: 50 })
  })

  it("reads a discount by its code with dates and flags in their app types", async () => {
    await expect(getDiscountByCode("SPRING-24")).resolves.toMatchObject({
      code: "SPRING-24",
      description: "Spring sale",
      endsAt: new Date(NOW + DAY_MS),
      id: "discount-1",
      isActive: true,
      startsAt: null,
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageCount: 0,
      usageLimit: 50,
      value: 15,
    })
  })

  it("matches the stored code exactly, leaving normalisation to the caller", async () => {
    await expect(getDiscountByCode("spring-24")).resolves.toBeUndefined()
  })

  it("reads a discount by its id", async () => {
    await expect(getDiscountById("discount-1")).resolves.toMatchObject({ code: "SPRING-24", id: "discount-1" })
  })

  it("reports nothing for an unknown code or id", async () => {
    await expect(getDiscountByCode("NOPE-99")).resolves.toBeUndefined()
    await expect(getDiscountById("discount-missing")).resolves.toBeUndefined()
  })
})

describe("countCustomerRedemptions", () => {
  beforeEach(() => {
    seedDiscount({ code: "SPRING-24", id: "discount-1" })
    seedDiscount({ code: "SUMMER-25", id: "discount-2" })
    seedRedemption({ amount: 1500, discountId: "discount-1", email: "ada@marte.test", id: "r-1" })
    seedRedemption({ amount: 1500, discountId: "discount-1", email: "ADA@Marte.test", id: "r-2" })
    seedRedemption({ amount: 1500, discountId: "discount-1", email: "grace@marte.test", id: "r-3" })
    seedRedemption({ amount: 1500, discountId: "discount-2", email: "ada@marte.test", id: "r-4" })
  })

  it("counts this customer's redemptions of this discount whatever the email's case", async () => {
    await expect(countCustomerRedemptions("discount-1", "  Ada@MARTE.test ")).resolves.toBe(2)
  })

  it("counts nothing for a customer who never used the discount", async () => {
    await expect(countCustomerRedemptions("discount-2", "grace@marte.test")).resolves.toBe(0)
  })

  it.each([undefined, "   "])("counts nothing for a missing email (%j) without asking the database", async (email) => {
    await expect(countCustomerRedemptions("discount-1", email)).resolves.toBe(0)
    expect(queries).toStrictEqual([])
  })

  it("reports zero when the database returns no count row", async () => {
    answerWithNoRows()

    await expect(countCustomerRedemptions("discount-1", "ada@marte.test")).resolves.toBe(0)
  })
})

describe("getAdminDiscountsPage", () => {
  beforeEach(() => {
    seedDiscount({ code: "SPRING-24", createdAt: NOW - 3 * DAY_MS, description: "Spring sale", id: "discount-1" })
    seedDiscount({ code: "SUMMER-25", createdAt: NOW - 2 * DAY_MS, description: "Holiday promo", id: "discount-2" })
    seedDiscount({ code: "WELCOME", createdAt: NOW - DAY_MS, id: "discount-3" })
  })

  it("lists the newest discounts first with the total count", async () => {
    const page = await getAdminDiscountsPage({ limit: 10, offset: 0 })

    expect(page.rows.map((row) => row.code)).toStrictEqual(["WELCOME", "SUMMER-25", "SPRING-24"])
    expect(page.total).toBe(3)
  })

  it("returns only the requested slice but counts every discount", async () => {
    const page = await getAdminDiscountsPage({ limit: 1, offset: 1 })

    expect(page.rows.map((row) => row.code)).toStrictEqual(["SUMMER-25"])
    expect(page.total).toBe(3)
  })

  it("finds discounts by code regardless of case", async () => {
    const page = await getAdminDiscountsPage({ limit: 10, offset: 0, search: "welcome" })

    expect(page.rows.map((row) => row.code)).toStrictEqual(["WELCOME"])
    expect(page.total).toBe(1)
  })

  it("finds discounts by description", async () => {
    const page = await getAdminDiscountsPage({ limit: 10, offset: 0, search: "HOLIDAY" })

    expect(page.rows.map((row) => row.code)).toStrictEqual(["SUMMER-25"])
  })

  it("reports an empty page when nothing matches", async () => {
    await expect(getAdminDiscountsPage({ limit: 10, offset: 0, search: "autumn" })).resolves.toStrictEqual({ rows: [], total: 0 })
  })

  it("reports a zero total when the database returns no count row", async () => {
    answerWithNoRows()

    await expect(getAdminDiscountsPage({ limit: 10, offset: 0 })).resolves.toStrictEqual({ rows: [], total: 0 })
  })
})

describe("getAdminDiscountStats", () => {
  it("reports zeros in the store currency before any discount exists", async () => {
    await expect(getAdminDiscountStats(new Date(NOW))).resolves.toStrictEqual({
      active: 0,
      currencyCode: STORE_CURRENCY_CODE,
      redeemedTotalMinorUnits: 0,
      redemptions: 0,
      total: 0,
    })
  })

  it("counts as active only the discounts a shopper could use right now", async () => {
    seedDiscount({ code: "OPEN", id: "d-open" })
    seedDiscount({ code: "IN-WINDOW", endsAt: NOW + DAY_MS, id: "d-window", startsAt: NOW - DAY_MS })
    seedDiscount({ code: "STARTS-NOW", id: "d-starts-now", startsAt: NOW })
    seedDiscount({ code: "HEADROOM", id: "d-headroom", usageCount: 9, usageLimit: 10 })
    seedDiscount({ code: "OFF", id: "d-off", isActive: false })
    seedDiscount({ code: "LATER", id: "d-later", startsAt: NOW + 1 })
    seedDiscount({ code: "ENDS-NOW", endsAt: NOW, id: "d-ends-now" })
    seedDiscount({ code: "USED-UP", id: "d-used-up", usageCount: 10, usageLimit: 10 })

    await expect(getAdminDiscountStats(new Date(NOW))).resolves.toMatchObject({ active: 4, total: 8 })
  })

  it("adds up every redemption and the money they took off", async () => {
    seedDiscount({ code: "SPRING-24", id: "discount-1" })
    seedDiscount({ code: "SUMMER-25", id: "discount-2", isActive: false })
    seedRedemption({ amount: 1500, discountId: "discount-1", email: "ada@marte.test", id: "r-1" })
    seedRedemption({ amount: 2500, discountId: "discount-1", email: "grace@marte.test", id: "r-2" })
    seedRedemption({ amount: 999, discountId: "discount-2", email: "ada@marte.test", id: "r-3" })

    await expect(getAdminDiscountStats(new Date(NOW))).resolves.toMatchObject({ redeemedTotalMinorUnits: 4999, redemptions: 3 })
  })

  it("reports zeros when the database returns no aggregate rows", async () => {
    seedDiscount({ code: "SPRING-24", id: "discount-1" })
    answerWithNoRows()

    await expect(getAdminDiscountStats(new Date(NOW))).resolves.toStrictEqual({
      active: 0,
      currencyCode: STORE_CURRENCY_CODE,
      redeemedTotalMinorUnits: 0,
      redemptions: 0,
      total: 0,
    })
  })
})

describe("insertDiscount", () => {
  it("stores a new discount with a generated id, no uses yet and creation timestamps", async () => {
    await insertDiscount({ code: "SPRING-24", type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 2500 })
    const stored = await getDiscountByCode("SPRING-24")

    expect(stored).toMatchObject({ code: "SPRING-24", isActive: true, type: DISCOUNT_TYPE.FIXED_AMOUNT, usageCount: 0, value: 2500 })
    expect(stored?.id).toMatch(/^[\da-f-]{36}$/u)
    expect(stored?.createdAt).toBeInstanceOf(Date)
    expect(stored?.updatedAt).toBeInstanceOf(Date)
  })

  it("refuses a second discount with the same code", async () => {
    await insertDiscount({ code: "SPRING-24", type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 2500 })

    await expect(insertDiscount({ code: "SPRING-24", type: DISCOUNT_TYPE.PERCENTAGE, value: 10 })).rejects.toThrow()
  })
})

describe("updateDiscountById", () => {
  beforeEach(() => {
    seedDiscount({ code: "SPRING-24", description: "Spring sale", endsAt: NOW + DAY_MS, id: "discount-1", usageLimit: 50 })
    seedDiscount({ code: "SUMMER-25", id: "discount-2" })
  })

  it("changes only the discount it was given", async () => {
    await updateDiscountById("discount-1", { code: "SPRING-26", value: 20 })

    expect(storedRow("discount-1")).toMatchObject({ code: "SPRING-26", value: 20 })
    expect(storedRow("discount-2")).toMatchObject({ code: "SUMMER-25", value: 15 })
  })

  it("clears the description, window and limits an admin emptied in the form", async () => {
    await updateDiscountById(
      "discount-1",
      toDiscountUpdateValues({ code: "spring-24", isActive: false, type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 3000 }),
    )

    expect(storedRow("discount-1")).toMatchObject({
      code: "SPRING-24",
      description: null,
      ends_at: null,
      is_active: 0,
      max_discount_amount: null,
      min_order_total: null,
      per_customer_limit: null,
      starts_at: null,
      type: DISCOUNT_TYPE.FIXED_AMOUNT,
      updated_at: NOW,
      usage_limit: null,
      value: 3000,
    })
  })
})

describe("deleteDiscountsByIds", () => {
  beforeEach(() => {
    seedDiscount({ code: "SPRING-24", id: "discount-1" })
    seedDiscount({ code: "SUMMER-25", id: "discount-2" })
    seedDiscount({ code: "WELCOME", id: "discount-3" })
  })

  it("deletes the listed discounts and leaves the rest", async () => {
    await expect(deleteDiscountsByIds(["discount-1", "discount-3"])).resolves.toBe(2)

    await expect(getAdminDiscountsPage({ limit: 10, offset: 0 })).resolves.toMatchObject({ rows: [{ id: "discount-2" }], total: 1 })
  })

  it("counts only the discounts that still existed", async () => {
    await expect(deleteDiscountsByIds(["discount-1", "discount-missing"])).resolves.toBe(1)
  })

  it("takes a deleted discount's redemptions with it", async () => {
    seedRedemption({ amount: 1500, discountId: "discount-1", email: "ada@marte.test", id: "r-1" })

    await deleteDiscountsByIds(["discount-1"])

    await expect(countCustomerRedemptions("discount-1", "ada@marte.test")).resolves.toBe(0)
  })
})

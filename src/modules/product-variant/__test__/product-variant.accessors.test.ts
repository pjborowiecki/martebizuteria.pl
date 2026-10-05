import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { MIN_PRICE_CENTS } from "~/src/modules/_core/utils/currency"
import { getSellPricesByVariantIds } from "~/src/modules/product-variant/product-variant.accessors"

const access = vi.hoisted(() => ({
  selectWhere: vi.fn<(condition: SQL | undefined) => Promise<{ price: number; variantId: string }[]>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    select: () => ({ from: () => ({ where: access.selectWhere }) }),
  },
}))

const dialect = new SQLiteSyncDialect()

describe("getSellPricesByVariantIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("answers an empty request without querying", async () => {
    await expect(getSellPricesByVariantIds([])).resolves.toStrictEqual(new Map())

    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("keys each variant's current price by its id, in one query for every variant", async () => {
    access.selectWhere.mockResolvedValue([
      { price: 37_900, variantId: "variant-a" },
      { price: 12_500, variantId: "variant-b" },
    ])

    await expect(getSellPricesByVariantIds(["variant-a", "variant-b"])).resolves.toStrictEqual(
      new Map([
        ["variant-a", 37_900],
        ["variant-b", 12_500],
      ]),
    )
    expect(access.selectWhere).toHaveBeenCalledOnce()
    const condition = access.selectWhere.mock.calls[0]?.[0]
    if (condition === undefined) {
      throw new Error("expected a where condition")
    }
    expect(dialect.sqlToQuery(condition)).toMatchObject({
      params: ['["variant-a","variant-b"]'],
      sql: '"product_variant"."id" in (select value from json_each(?))',
    })
  })

  it("leaves out a variant whose price checkout would refuse", async () => {
    access.selectWhere.mockResolvedValue([
      { price: MIN_PRICE_CENTS, variantId: "variant-floor" },
      { price: MIN_PRICE_CENTS - 1, variantId: "variant-below" },
      { price: 0, variantId: "variant-unpriced" },
    ])

    await expect(getSellPricesByVariantIds(["variant-floor", "variant-below", "variant-unpriced"])).resolves.toStrictEqual(
      new Map([["variant-floor", MIN_PRICE_CENTS]]),
    )
  })
})

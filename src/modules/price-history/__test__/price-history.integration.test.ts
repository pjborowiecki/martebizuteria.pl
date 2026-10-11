import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"
import { MIGRATION, applyMigration, applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { getPriceReductions, withPriceReductions } from "~/src/modules/price-history/price-history.accessors"

const { sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }), trips: [] as TestD1RoundTrip[] }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        trips.push(trip)
      }),
      { schema },
    ),
  }
})

const DAY = 86_400_000

const MS_PER_SECOND = 1000

const SAVED_AT = Date.UTC(2026, 8, 1)

const REDUCED_AT = Date.UTC(2026, 9, 1)

const RING = "variant-ring"

const CHAIN = "variant-chain"

const historyRowsSchema = z.array(z.object({ changed_at: z.number(), compare_at_price: z.number().nullable(), price: z.number() }))

const historyOf = (variantId: string) =>
  historyRowsSchema.parse(
    sqlite.prepare("select changed_at, compare_at_price, price from price_history where variant_id = ? order by id").all(variantId),
  )

const pricesOf = (variantId: string) => historyOf(variantId).map(({ compare_at_price, price }) => ({ compare_at_price, price }))

const insertVariant = (id: string, price: number, compareAtPrice: number | null = null): void => {
  sqlite
    .prepare(
      `insert into product_variant (id, product_id, title, price, compare_at_price, created_at, updated_at)
       values (?, 'product-1', 'Default', ?, ?, ?, ?)`,
    )
    .run(id, price, compareAtPrice, SAVED_AT, SAVED_AT)
}

const setPrice = (variantId: string, price: number, compareAtPrice: number | null): void => {
  sqlite.prepare("update product_variant set price = ?, compare_at_price = ? where id = ?").run(price, compareAtPrice, variantId)
}

type HistoryEntry = readonly [daysBeforeReduction: number, price: number, compareAtPrice: number | null]

interface PricedVariantState {
  readonly compareAtPrice: number
  readonly price: number
}

const REDUCED: PricedVariantState = { compareAtPrice: 30_000, price: 20_000 }

interface HistoryCase {
  readonly history: readonly HistoryEntry[]
  readonly label: string
  readonly variant: PricedVariantState
}

interface LookbackCase extends HistoryCase {
  readonly lowestPrice: number
}

const rewriteHistory = (variantId: string, entries: readonly HistoryEntry[]): void => {
  sqlite.prepare("delete from price_history where variant_id = ?").run(variantId)
  const insert = sqlite.prepare("insert into price_history (variant_id, changed_at, price, compare_at_price) values (?, ?, ?, ?)")
  for (const [daysBeforeReduction, price, compareAtPrice] of entries) {
    insert.run(variantId, REDUCED_AT - daysBeforeReduction * DAY, price, compareAtPrice)
  }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec(`
    delete from product;
    insert into product (id, handle, titles, status, rank, created_at, updated_at)
      values ('product-1', 'silver-ring', '{"en-US":"Silver ring","pl-PL":"Srebrny pierścionek"}', 'published', 0, 0, 0);
  `)
  trips.splice(0)
})

afterAll(() => {
  sqlite.close()
})

describe("price_history migration", () => {
  beforeEach(() => {
    sqlite.exec(`
      drop trigger price_history_variant_insert;
      drop trigger price_history_variant_update;
      drop table price_history;
    `)
  })

  it("records every variant's current price as of the variant's last save", () => {
    insertVariant(RING, 24_900, 29_900)
    insertVariant(CHAIN, 18_000)

    applyMigration(sqlite, MIGRATION.PRICE_HISTORY)

    expect(historyOf(RING)).toStrictEqual([{ changed_at: SAVED_AT, compare_at_price: 29_900, price: 24_900 }])
    expect(historyOf(CHAIN)).toStrictEqual([{ changed_at: SAVED_AT, compare_at_price: null, price: 18_000 }])
  })

  it("shows no reduction for a variant that already had a compare-at price, because nothing shows it ever cost more", async () => {
    insertVariant(RING, 24_900, 29_900)

    applyMigration(sqlite, MIGRATION.PRICE_HISTORY)

    await expect(getPriceReductions([{ compareAtPrice: 29_900, id: RING, price: 24_900 }])).resolves.toStrictEqual(new Map())
  })
})

describe("price_history triggers", () => {
  it("records a new variant's price at the second it is created", () => {
    const before = Date.now()

    insertVariant(RING, 24_900)

    const [entry] = historyOf(RING)
    expect(entry).toMatchObject({ compare_at_price: null, price: 24_900 })
    expect(entry?.changed_at).toBeGreaterThanOrEqual(before - (before % MS_PER_SECOND))
    expect(entry?.changed_at).toBeLessThanOrEqual(Date.now())
  })

  it("records each change of the price or the compare-at price", () => {
    insertVariant(RING, 24_900)

    setPrice(RING, 19_900, 24_900)
    setPrice(RING, 19_900, 26_900)

    expect(pricesOf(RING)).toStrictEqual([
      { compare_at_price: null, price: 24_900 },
      { compare_at_price: 24_900, price: 19_900 },
      { compare_at_price: 26_900, price: 19_900 },
    ])
  })

  it("records nothing when a save leaves both prices as they were", () => {
    insertVariant(RING, 24_900, 29_900)

    setPrice(RING, 24_900, 29_900)
    sqlite.prepare("update product_variant set title = 'Large', sku = 'RING-L' where id = ?").run(RING)

    expect(pricesOf(RING)).toStrictEqual([{ compare_at_price: 29_900, price: 24_900 }])
  })

  it("drops a variant's price history with the variant", () => {
    insertVariant(RING, 24_900)

    sqlite.prepare("delete from product_variant where id = ?").run(RING)

    expect(historyOf(RING)).toStrictEqual([])
  })
})

const LOOKBACK_CASES: readonly LookbackCase[] = [
  {
    history: [
      [60, 15_000, null],
      [40, 30_000, null],
      [0, 20_000, 30_000],
    ],
    label: "leaves out a lower price that ended before the 30 days began",
    lowestPrice: 30_000,
    variant: REDUCED,
  },
  {
    history: [
      [45, 25_000, null],
      [10, 30_000, null],
      [0, 20_000, 30_000],
    ],
    label: "counts the price that was still in effect when the 30 days began",
    lowestPrice: 25_000,
    variant: REDUCED,
  },
  {
    history: [
      [60, 26_000, null],
      [30, 27_000, null],
      [0, 20_000, 30_000],
    ],
    label: "counts a price that took effect exactly 30 days before the reduction and not the one it replaced",
    lowestPrice: 27_000,
    variant: REDUCED,
  },
  {
    history: [
      [50, 30_000, null],
      [15, 22_000, null],
      [14, 30_000, null],
      [0, 20_000, 30_000],
    ],
    label: "counts a lower price that lasted only a day within the 30 days",
    lowestPrice: 22_000,
    variant: REDUCED,
  },
  {
    history: [
      [40, 30_000, null],
      [10, 24_000, 30_000],
      [0, 20_000, 30_000],
    ],
    label: "measures a further cut from the day of that cut",
    lowestPrice: 24_000,
    variant: REDUCED,
  },
  {
    history: [
      [45, 30_000, null],
      [5, 20_000, 30_000],
      [0, 20_000, 32_000],
    ],
    label: "keeps measuring from the day the price was cut when only the compare-at price changes later",
    lowestPrice: 30_000,
    variant: { compareAtPrice: 32_000, price: 20_000 },
  },
]

const UNBACKED_REDUCTION_CASES: readonly HistoryCase[] = [
  {
    history: [
      [45, 18_000, null],
      [10, 30_000, null],
      [0, 20_000, 30_000],
    ],
    label: "shows no reduction when the price was lower than the reduced price during the 30 days",
    variant: REDUCED,
  },
  {
    history: [
      [60, 20_000, null],
      [0, 20_000, 30_000],
    ],
    label: "shows no reduction when a compare-at price is added without lowering the price",
    variant: REDUCED,
  },
  {
    history: [[0, 20_000, 30_000]],
    label: "shows no reduction when the variant was first offered at its reduced price",
    variant: REDUCED,
  },
  {
    history: [
      [40, 30_000, null],
      [10, 18_000, 30_000],
      [0, 20_000, 30_000],
    ],
    label: "shows no reduction when the price was raised while it stayed under the compare-at price",
    variant: REDUCED,
  },
]

describe("getPriceReductions over the 30 days before a reduction", () => {
  beforeEach(() => {
    insertVariant(RING, 30_000)
  })

  it.each(LOOKBACK_CASES)("$label", async ({ history, lowestPrice, variant: { compareAtPrice, price } }) => {
    setPrice(RING, price, compareAtPrice)
    rewriteHistory(RING, history)

    const reductions = await getPriceReductions([{ compareAtPrice, id: RING, price }])

    expect(reductions).toStrictEqual(new Map([[RING, { lowestPrice }]]))
  })

  it.each(UNBACKED_REDUCTION_CASES)("$label", async ({ history, variant: { compareAtPrice, price } }) => {
    setPrice(RING, price, compareAtPrice)
    rewriteHistory(RING, history)

    await expect(getPriceReductions([{ compareAtPrice, id: RING, price }])).resolves.toStrictEqual(new Map())
  })
})

describe("getPriceReductions", () => {
  beforeEach(() => {
    insertVariant(RING, 30_000)
    insertVariant(CHAIN, 18_000)
  })

  it("keeps the lowest price after the 30 days have passed, because it belongs to the day of the reduction", async () => {
    setPrice(RING, 20_000, 30_000)
    rewriteHistory(RING, [
      [400, 30_000, null],
      [365, 20_000, 30_000],
    ])

    await expect(getPriceReductions([{ compareAtPrice: 30_000, id: RING, price: 20_000 }])).resolves.toStrictEqual(
      new Map([[RING, { lowestPrice: 30_000 }]]),
    )
  })

  it("shows no reduction when the history does not hold the price the variant sells at", async () => {
    setPrice(RING, 20_000, 30_000)
    rewriteHistory(RING, [
      [40, 30_000, null],
      [0, 21_000, 30_000],
    ])

    await expect(getPriceReductions([{ compareAtPrice: 30_000, id: RING, price: 20_000 }])).resolves.toStrictEqual(new Map())
  })

  it("shows no reduction when the history ends on a full price", async () => {
    setPrice(RING, 20_000, 30_000)
    rewriteHistory(RING, [[0, 20_000, null]])

    await expect(getPriceReductions([{ compareAtPrice: 30_000, id: RING, price: 20_000 }])).resolves.toStrictEqual(new Map())
  })

  it("reads the history of every reduced variant in one statement and leaves full-price variants out", async () => {
    setPrice(RING, 20_000, 30_000)
    setPrice(CHAIN, 15_000, 18_000)
    rewriteHistory(RING, [
      [40, 30_000, null],
      [0, 20_000, 30_000],
    ])
    rewriteHistory(CHAIN, [
      [40, 18_000, null],
      [0, 15_000, 18_000],
    ])

    const reductions = await getPriceReductions([
      { compareAtPrice: 30_000, id: RING, price: 20_000 },
      { compareAtPrice: 18_000, id: CHAIN, price: 15_000 },
      { compareAtPrice: null, id: "variant-cuff", price: 9000 },
      { compareAtPrice: 9000, id: "variant-pin", price: 9000 },
    ])

    expect(reductions).toStrictEqual(
      new Map([
        [RING, { lowestPrice: 30_000 }],
        [CHAIN, { lowestPrice: 18_000 }],
      ]),
    )
    expect(trips).toHaveLength(1)
  })

  it("reads nothing when no variant is reduced", async () => {
    await expect(
      getPriceReductions([
        { compareAtPrice: null, id: RING, price: 30_000 },
        { compareAtPrice: 18_000, id: CHAIN, price: 18_000 },
      ]),
    ).resolves.toStrictEqual(new Map())
    expect(trips).toStrictEqual([])
  })
})

describe("withPriceReductions", () => {
  it("gives each listed variant its reduction, or none, from one read", async () => {
    insertVariant(RING, 20_000, 30_000)
    insertVariant(CHAIN, 18_000)
    rewriteHistory(RING, [
      [40, 30_000, null],
      [0, 20_000, 30_000],
    ])

    const products = await withPriceReductions([
      { handle: "silver-ring", variants: [{ compareAtPrice: 30_000, id: RING, price: 20_000 }] },
      { handle: "gold-chain", variants: [{ compareAtPrice: null, id: CHAIN, price: 18_000 }] },
    ])

    expect(products).toStrictEqual([
      {
        handle: "silver-ring",
        variants: [{ compareAtPrice: 30_000, id: RING, price: 20_000, priceReduction: { lowestPrice: 30_000 } }],
      },
      { handle: "gold-chain", variants: [{ compareAtPrice: null, id: CHAIN, price: 18_000, priceReduction: undefined }] },
    ])
    expect(trips).toHaveLength(1)
  })
})

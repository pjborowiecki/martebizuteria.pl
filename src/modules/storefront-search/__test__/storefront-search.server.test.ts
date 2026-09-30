import { type SQL, sql } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  buildCategorySearchCondition,
  buildCollectionSearchCondition,
  searchStorefrontCategories,
  searchStorefrontCollections,
  searchStorefrontProducts,
} from "~/src/modules/storefront-search/storefront-search.server"

const access = vi.hoisted(() => {
  const conditions: (SQL | undefined)[] = []
  const limits: number[] = []
  const results: Record<string, unknown>[][] = []

  const nextResult = () => Promise.resolve(results.shift() ?? [])

  const where = vi.fn((condition: SQL | undefined) => {
    conditions.push(condition)
    const result = nextResult()

    return Object.assign(result, {
      orderBy: () => ({
        limit: (value: number) => {
          limits.push(value)

          return result
        },
      }),
    })
  })

  return {
    conditions,
    limits,
    queue: (rows: Record<string, unknown>[]) => {
      results.push(rows)
    },
    reset: () => {
      conditions.length = 0
      limits.length = 0
      results.length = 0
    },
    where,
  }
})

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/modules/product/product.admin-list-search.server", () => ({
  buildAdminProductSearchCondition: (term: string | undefined) => (term?.trim() === "" || term === undefined ? undefined : sql`1 = 1`),
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { select: () => ({ from: () => ({ where: access.where }) }) },
}))

const dialect = new SQLiteSyncDialect()

const lastQuery = () => {
  const condition = access.conditions.at(-1)
  if (condition === undefined) {
    throw new Error("expected a where condition")
  }

  return dialect.sqlToQuery(condition)
}

const titles = (english: string, polish: string) => ({ "en-US": english, "pl-PL": polish })

describe("buildCategorySearchCondition", () => {
  it("matches nothing for a blank term", () => {
    expect(buildCategorySearchCondition("   ")).toBeUndefined()
  })

  it("searches the handle and every localized copy column", () => {
    const condition = buildCategorySearchCondition("Ring")
    if (condition === undefined) {
      throw new Error("expected a condition")
    }

    const { params, sql: text } = dialect.sqlToQuery(condition)
    expect(params).toStrictEqual(["%ring%", "%ring%", "%ring%", "%ring%"])
    expect(text).toContain('lower(cast("product_category"."handle" as text)) like ?')
    expect(text).toContain('lower(cast("product_category"."titles" as text)) like ?')
  })

  it("escapes the wildcards a shopper types", () => {
    const condition = buildCategorySearchCondition("50%_off")
    if (condition === undefined) {
      throw new Error("expected a condition")
    }

    expect(dialect.sqlToQuery(condition).params[0]).toBe(String.raw`%50\%\_off%`)
  })
})

describe("buildCollectionSearchCondition", () => {
  it("matches nothing for a blank term", () => {
    expect(buildCollectionSearchCondition("")).toBeUndefined()
  })

  it("searches the collection handle, titles and descriptions", () => {
    const condition = buildCollectionSearchCondition("sale")
    if (condition === undefined) {
      throw new Error("expected a condition")
    }

    const { params, sql: text } = dialect.sqlToQuery(condition)
    expect(params).toStrictEqual(["%sale%", "%sale%", "%sale%"])
    expect(text).toContain('lower(cast("product_collection"."descriptions" as text)) like ?')
  })
})

describe("searchStorefrontCategories", () => {
  beforeEach(() => {
    access.reset()
    access.where.mockClear()
  })

  it("returns nothing for a blank term without querying", async () => {
    await expect(searchStorefrontCategories("  ", "en-US", 6)).resolves.toStrictEqual([])
    expect(access.where).not.toHaveBeenCalled()
  })

  it("maps every row to a localized category result", async () => {
    access.queue([{ handle: "rings", image: "categories/rings.webp", titles: titles("Rings", "Pierscionki") }])

    await expect(searchStorefrontCategories("ring", "en-US", 6)).resolves.toStrictEqual([
      { handle: "rings", image: "cdn/categories/rings.webp", name: "Rings", type: "category" },
    ])
  })

  it("resolves the name in the requested locale", async () => {
    access.queue([{ handle: "rings", image: null, titles: titles("Rings", "Pierscionki") }])

    const results = await searchStorefrontCategories("ring", "pl-PL", 6)

    expect(results[0]?.name).toBe("Pierscionki")
  })

  it("only offers active categories and honours the limit", async () => {
    access.queue([])

    await searchStorefrontCategories("ring", "en-US", 4)

    expect(lastQuery().params).toContain("active")
    expect(access.limits.at(-1)).toBe(4)
  })
})

describe("searchStorefrontCollections", () => {
  beforeEach(() => {
    access.reset()
    access.where.mockClear()
  })

  it("returns nothing for a blank term without querying", async () => {
    await expect(searchStorefrontCollections("", "en-US", 6)).resolves.toStrictEqual([])
    expect(access.where).not.toHaveBeenCalled()
  })

  it("maps every row to a localized collection result", async () => {
    access.queue([{ handle: "sale", image: null, titles: titles("Sale", "Wyprzedaz") }])

    await expect(searchStorefrontCollections("sale", "en-US", 6)).resolves.toStrictEqual([
      { handle: "sale", image: "cdn/placeholder", name: "Sale", type: "collection" },
    ])
  })

  it("only offers active collections", async () => {
    access.queue([])

    await searchStorefrontCollections("sale", "en-US", 6)

    expect(lastQuery().params).toContain("active")
  })
})

describe("searchStorefrontProducts", () => {
  beforeEach(() => {
    access.reset()
    access.where.mockClear()
  })

  it("returns nothing for a blank term without querying", async () => {
    await expect(searchStorefrontProducts("   ", "en-US", 6)).resolves.toStrictEqual([])
    expect(access.where).not.toHaveBeenCalled()
  })

  it("returns nothing when no product matches, without looking categories up", async () => {
    access.queue([])

    await expect(searchStorefrontProducts("ring", "en-US", 6)).resolves.toStrictEqual([])
    expect(access.where).toHaveBeenCalledTimes(1)
  })

  it("prefers the localized subtitle as the result detail", async () => {
    access.queue([
      {
        handle: "silver-ring",
        primaryCategoryId: null,
        subtitles: titles("Hand made", "Recznie robiony"),
        thumbnail: "products/ring.webp",
        titles: titles("Silver ring", "Srebrny pierscionek"),
      },
    ])

    await expect(searchStorefrontProducts("ring", "en-US", 6)).resolves.toStrictEqual([
      { detail: "Hand made", handle: "silver-ring", image: "cdn/products/ring.webp", name: "Silver ring", type: "product" },
    ])
  })

  it("falls back to the primary category title when the product has no subtitle", async () => {
    access.queue([
      {
        handle: "silver-ring",
        primaryCategoryId: "category-1",
        subtitles: titles("", ""),
        thumbnail: null,
        titles: titles("Silver ring", "Srebrny pierscionek"),
      },
    ])
    access.queue([{ id: "category-1", titles: titles("Rings", "Pierscionki") }])

    const results = await searchStorefrontProducts("ring", "en-US", 6)

    expect(results[0]?.detail).toBe("Rings")
  })

  it("leaves the detail out when neither a subtitle nor a category exists", async () => {
    access.queue([
      { handle: "silver-ring", primaryCategoryId: null, subtitles: null, thumbnail: null, titles: titles("Silver ring", "Srebrny") },
    ])

    const results = await searchStorefrontProducts("ring", "en-US", 6)

    expect(results[0]?.detail).toBeUndefined()
  })

  it("asks for each primary category only once", async () => {
    access.queue([
      { handle: "ring-a", primaryCategoryId: "category-1", subtitles: null, thumbnail: null, titles: titles("Ring A", "Ring A") },
      { handle: "ring-b", primaryCategoryId: "category-1", subtitles: null, thumbnail: null, titles: titles("Ring B", "Ring B") },
    ])
    access.queue([{ id: "category-1", titles: titles("Rings", "Pierscionki") }])

    await searchStorefrontProducts("ring", "en-US", 6)

    expect(lastQuery()).toMatchObject({ params: ["category-1"], sql: '"product_category"."id" in (?)' })
  })

  it("honours the requested limit", async () => {
    access.queue([])

    await searchStorefrontProducts("ring", "en-US", 3)

    expect(access.limits.at(-1)).toBe(3)
  })
})

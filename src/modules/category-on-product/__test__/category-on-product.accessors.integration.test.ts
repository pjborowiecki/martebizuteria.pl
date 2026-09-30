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

import {
  countProductsForCategories,
  getCategoryProductTotalQuery,
  getProductCountsQuery,
} from "~/src/modules/category-on-product/category-on-product.accessors"

const DDL = `
  drop table if exists category_on_product;
  create table category_on_product (
    category_id text not null, product_id text not null, is_primary integer not null default 0,
    primary key (product_id, category_id)
  );
`

beforeEach(() => {
  sqlite.exec(DDL)
  sqlite.exec(`
    insert into category_on_product (category_id, product_id, is_primary) values
      ('cat-rings', 'p-ring', 1),
      ('cat-rings', 'p-signet', 1),
      ('cat-chains', 'p-chain', 1),
      ('cat-chains', 'p-ring', 0),
      ('cat-empty-parent', 'p-signet', 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("countProductsForCategories", () => {
  it("counts the join rows of a single category", async () => {
    await expect(countProductsForCategories(["cat-rings"])).resolves.toBe(2)
  })

  it("adds the join rows of every requested category", async () => {
    await expect(countProductsForCategories(["cat-rings", "cat-chains"])).resolves.toBe(4)
  })

  it("returns zero without querying for an empty request", async () => {
    await expect(countProductsForCategories([])).resolves.toBe(0)
  })

  it("returns zero for a category nothing is filed under", async () => {
    await expect(countProductsForCategories(["cat-unknown"])).resolves.toBe(0)
  })

  it("counts a product once per category it belongs to", async () => {
    await expect(countProductsForCategories(["cat-chains"])).resolves.toBe(2)
  })

  it("returns zero when the join table is empty", async () => {
    sqlite.exec("delete from category_on_product")

    await expect(countProductsForCategories(["cat-rings"])).resolves.toBe(0)
  })
})

describe("getProductCountsQuery", () => {
  it("reports one row per category with its product count", async () => {
    const rows = await getProductCountsQuery.execute()
    const byCategory = new Map(rows.map((row) => [row.categoryId, row.count]))

    expect(byCategory.get("cat-rings")).toBe(2)
    expect(byCategory.get("cat-chains")).toBe(2)
    expect(byCategory.get("cat-empty-parent")).toBe(1)
  })

  it("leaves out categories with no products at all", async () => {
    const rows = await getProductCountsQuery.execute()

    expect(rows.map((row) => row.categoryId)).not.toContain("cat-unknown")
  })

  it("returns nothing when nothing is categorised", async () => {
    sqlite.exec("delete from category_on_product")

    await expect(getProductCountsQuery.execute()).resolves.toStrictEqual([])
  })
})

describe("getCategoryProductTotalQuery", () => {
  it("counts each product once however many categories it sits in", async () => {
    const rows = await getCategoryProductTotalQuery.execute()

    expect(rows[0]?.value).toBe(3)
  })

  it("still returns a single zero row when nothing is categorised", async () => {
    sqlite.exec("delete from category_on_product")
    const rows = await getCategoryProductTotalQuery.execute()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.value).toBe(0)
  })
})

import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type TestD1Query } from "~/src/platform/testing/mocks/d1"

import { setProductAttributeRanks } from "~/src/modules/product-attribute/product-attribute.server"
import { getProductVariantSkuRowsQuery, getProductVariantStatsQuery } from "~/src/modules/product/product.accessors"
import { getPublishedProductCountsByRootCategory } from "~/src/modules/product/product.storefront-catalog.accessors"

const { sqlite, queries } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    queries: [] as TestD1Query[],
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")
  const client = createTestD1Database(sqlite, (query) => {
    queries.push(query)
  })

  return { db: drizzle(client, { schema }) }
})

describe("catalog database queries", () => {
  beforeEach(() => {
    sqlite.exec(`
    drop table if exists product;
    drop table if exists product_variant;
    drop table if exists inventory;
    drop table if exists product_category;
    drop table if exists category_on_product;
    drop table if exists product_attribute;
    create table product (id text primary key, status text);
    create table product_variant (id text primary key, product_id text, price integer, sku text);
    create table inventory (variant_id text primary key, quantity_available integer);
    create table product_category (id text primary key, parent_id text, status text);
    create table category_on_product (category_id text, product_id text);
    create table product_attribute (id text primary key, rank integer, updated_at integer);
  `)
    queries.length = 0
  })

  afterAll(() => {
    sqlite.close()
  })

  describe("admin product aggregates", () => {
    it("limits variant statistics and SKUs to the requested products", async () => {
      sqlite.exec(`
      insert into product_variant values
        ('v1', 'p1', 200, 'SKU-1'),
        ('v2', 'p1', 100, null),
        ('v3', 'p2', 300, 'SKU-2'),
        ('v4', 'unrelated', 1, 'OTHER');
      insert into inventory values ('v1', 3), ('v2', -1), ('v4', 999);
    `)
      const input = { productIds: JSON.stringify(["p1", "p2"]) }

      const stats = await getProductVariantStatsQuery.execute(input)
      const skus = await getProductVariantSkuRowsQuery.execute(input)

      expect(stats).toStrictEqual([
        { minPrice: 100, productId: "p1", totalStock: 2, variantCount: 2 },
        { minPrice: 300, productId: "p2", totalStock: 0, variantCount: 1 },
      ])
      expect(skus).toStrictEqual([
        { productId: "p1", sku: "SKU-1" },
        { productId: "p1", sku: null },
        { productId: "p2", sku: "SKU-2" },
      ])
    })

    it("handles empty selections without exposing unrelated rows", async () => {
      sqlite.exec("insert into product_variant values ('v1', 'p1', 200, 'SKU-1')")
      const input = { productIds: "[]" }

      await expect(getProductVariantStatsQuery.execute(input)).resolves.toStrictEqual([])
      await expect(getProductVariantSkuRowsQuery.execute(input)).resolves.toStrictEqual([])
    })

    it("uses one binding for exports larger than D1's SQL parameter limit", async () => {
      sqlite.exec("insert into product_variant values ('v1', 'p119', 200, 'SKU-119')")
      const productIds = JSON.stringify(Array.from({ length: 120 }, (_, index) => `p${index}`))

      await expect(getProductVariantSkuRowsQuery.execute({ productIds })).resolves.toStrictEqual([{ productId: "p119", sku: "SKU-119" }])
      expect(queries[0]?.params).toHaveLength(1)
    })
  })

  describe("storefront root category counts", () => {
    it("counts each published in-stock product once per root, including nested descendants", async () => {
      sqlite.exec(`
      insert into product_category values
        ('a', null, 'active'), ('b', null, 'active'), ('empty', null, 'active'),
        ('hidden', null, 'draft'), ('child', 'a', 'draft'), ('grandchild', 'child', 'active');
      insert into product values
        ('shared', 'published'), ('nested', 'published'), ('zero', 'published'),
        ('draft', 'draft'), ('net-zero', 'published'), ('no-inventory', 'published'), ('hidden-product', 'published');
      insert into product_variant values
        ('v1', 'shared', 100, null), ('v2', 'nested', 100, null), ('v3', 'zero', 100, null),
        ('v4', 'draft', 100, null), ('v5', 'net-zero', 100, null), ('v6', 'net-zero', 100, null),
        ('v7', 'no-inventory', 100, null), ('v8', 'hidden-product', 100, null);
      insert into inventory values
        ('v1', 1), ('v2', 2), ('v3', 0), ('v4', 3), ('v5', 5), ('v6', -5), ('v8', 1);
      insert into category_on_product values
        ('a', 'shared'), ('child', 'shared'), ('grandchild', 'shared'), ('b', 'shared'),
        ('grandchild', 'nested'), ('grandchild', 'zero'), ('a', 'draft'),
        ('a', 'net-zero'), ('a', 'no-inventory'), ('hidden', 'hidden-product');
    `)

      const counts = await getPublishedProductCountsByRootCategory()
      expect(counts).toMatchObject([
        { categoryId: "a", count: 2 },
        { categoryId: "b", count: 1 },
      ])
      expect(queries).toHaveLength(1)
    })
  })

  describe("product attribute reordering", () => {
    it("updates ranks in bounded atomic statements and preserves attributes outside the selection", async () => {
      const insert = sqlite.prepare("insert into product_attribute values (?, ?, 0)")
      const updates = Array.from({ length: 75 }, (_, index) => ({ id: `a${index}`, rank: 74 - index }))
      for (const { id } of updates) {
        insert.run(id, 0)
      }
      insert.run("unchanged", 99)

      await setProductAttributeRanks(updates)

      const rows = sqlite.prepare("select id, rank from product_attribute").all()
      expect(rows).toMatchObject([...updates, { id: "unchanged", rank: 99 }])
      expect(queries).toHaveLength(2)
      expect(Math.max(...queries.map((query) => query.params.length))).toBeLessThanOrEqual(100)
    })

    it("skips database access for an empty reorder", async () => {
      await setProductAttributeRanks([])
      expect(queries).toHaveLength(0)
    })
  })
})

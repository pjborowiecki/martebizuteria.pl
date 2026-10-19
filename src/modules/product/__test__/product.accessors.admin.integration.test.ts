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

const { attributeOnProduct } = await import("~/src/modules/attribute-on-product/attribute-on-product.schema")
const { categoryOnProduct } = await import("~/src/modules/category-on-product/category-on-product.schema")
const { collectionOnProduct } = await import("~/src/modules/collection-on-product/collection-on-product.schema")
const { inventory } = await import("~/src/modules/inventory/inventory.schema")
const { optionOnVariant } = await import("~/src/modules/option-on-variant/option-on-variant.schema")
const { productAttribute } = await import("~/src/modules/product-attribute/product-attribute.schema")
const { productCategory } = await import("~/src/modules/product-category/product-category.schema")
const { productCollection } = await import("~/src/modules/product-collection/product-collection.schema")
const { productImage } = await import("~/src/modules/product-image/product-image.schema")
const { productOptionValue } = await import("~/src/modules/product-option-value/product-option-value.schema")
const { productOption } = await import("~/src/modules/product-option/product-option.schema")
const { productVariant } = await import("~/src/modules/product-variant/product-variant.schema")
const { product } = await import("~/src/modules/product/product.schema")
const { getLowStockPublishedProductCountQuery, getMaxRankQuery, getProductStatusCountsQuery } =
  await import("~/src/modules/product/product.accessors")

const { createTables } = await import("./product-sqlite-schema")

const TABLES = [
  productCategory,
  productCollection,
  productAttribute,
  product,
  productVariant,
  inventory,
  productOption,
  productOptionValue,
  optionOnVariant,
  productImage,
  categoryOnProduct,
  collectionOnProduct,
  attributeOnProduct,
]

const NOW = 1_770_000_000_000

const DAY = 86_400_000

const titlesJson = (title: string): string => JSON.stringify({ "en-US": title, "pl-PL": title })

const insertProduct = (input: {
  createdAt?: number
  handle: string
  id: string
  rank?: number
  status?: "archived" | "draft" | "published"
  title: string
  updatedAt?: number
}): void => {
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.handle,
      input.rank ?? 0,
      input.status ?? "published",
      titlesJson(input.title),
      input.createdAt ?? NOW,
      input.updatedAt ?? NOW,
    )
}

const insertVariant = (input: { id: string; price: number; productId: string; sku?: string | null; stock?: number | null }): void => {
  sqlite
    .prepare(
      `insert into product_variant (id, product_id, sku, title, price, manage_inventory, created_at, updated_at)
       values (?, ?, ?, 'Default', ?, 1, ?, ?)`,
    )
    .run(input.id, input.productId, input.sku ?? null, input.price, NOW, NOW)
  if (input.stock !== null && input.stock !== undefined) {
    sqlite
      .prepare(
        `insert into inventory (id, variant_id, quantity_available, quantity_reserved, created_at, updated_at)
         values (?, ?, ?, 0, ?, ?)`,
      )
      .run(`inv-${input.id}`, input.id, input.stock, NOW, NOW)
  }
}

const seedCatalog = (): void => {
  insertProduct({ handle: "silver-ring", id: "p1", rank: 0, title: "Silver ring" })
  insertProduct({ createdAt: NOW - DAY, handle: "gold-chain", id: "p2", rank: 1, title: "Gold chain", updatedAt: NOW - DAY })
  insertProduct({ handle: "draft-cuff", id: "p3", rank: 2, status: "draft", title: "Draft cuff" })
  insertProduct({ handle: "archived-pin", id: "p4", rank: 3, status: "archived", title: "Archived pin" })
  insertVariant({ id: "v1", price: 9900, productId: "p1", sku: "RING-1", stock: 4 })
  insertVariant({ id: "v1b", price: 12_900, productId: "p1", sku: "RING-2", stock: 20 })
  insertVariant({ id: "v2", price: 4900, productId: "p2", sku: "CHAIN-1", stock: 0 })
  insertVariant({ id: "v3", price: 19_900, productId: "p3", sku: "CUFF-1", stock: 50 })
}

beforeEach(() => {
  createTables(sqlite, TABLES)
  seedCatalog()
})

afterAll(() => {
  sqlite.close()
})

describe("product aggregate queries", () => {
  it("counts the products in each status", async () => {
    await expect(getProductStatusCountsQuery.execute()).resolves.toStrictEqual([{ active: 2, archived: 1, draft: 1, total: 4 }])
  })

  it("reports the highest rank in use", async () => {
    await expect(getMaxRankQuery.execute()).resolves.toStrictEqual([{ value: 3 }])
  })

  it("counts only published products whose stock sits inside the low band", async () => {
    await expect(getLowStockPublishedProductCountQuery.execute()).resolves.toStrictEqual([{ count: 0 }])
  })

  it("counts a published product once its stock drops into the low band", async () => {
    sqlite.prepare("update inventory set quantity_available = 2 where variant_id = 'v1b'").run()

    await expect(getLowStockPublishedProductCountQuery.execute()).resolves.toStrictEqual([{ count: 1 }])
  })
})

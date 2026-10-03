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

const { productImage } = await import("~/src/modules/product-image/product-image.schema")
const { productVariant } = await import("~/src/modules/product-variant/product-variant.schema")
const { product } = await import("~/src/modules/product/product.schema")
const { getProductImagesQuery } = await import("~/src/modules/product-image/product-image.server")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const TABLES = [product, productVariant, productImage]

const EARLIER = Date.UTC(2026, 0, 10)

const LATER = Date.UTC(2026, 0, 11)

const insertProduct = (id: string, thumbnail: string | null): void => {
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, thumbnail, created_at, updated_at)
       values (?, ?, 0, 'draft', '{"en-US":"T"}', ?, ?, ?)`,
    )
    .run(id, id, thumbnail, EARLIER, EARLIER)
}

const insertImage = (row: {
  readonly createdAt?: number
  readonly id: string
  readonly productId: string
  readonly rank: number
  readonly url: string
}): void => {
  const createdAt = row.createdAt ?? EARLIER
  sqlite
    .prepare(`insert into product_image (id, product_id, url, rank, created_at, updated_at) values (?, ?, ?, ?, ?, ?)`)
    .run(row.id, row.productId, row.url, row.rank, createdAt, createdAt)
}

beforeEach(() => {
  createTables(sqlite, TABLES)
  insertProduct("p-ring", "old-thumb.webp")
  insertProduct("p-necklace", null)
})

afterAll(() => {
  sqlite.close()
})

describe("getProductImagesQuery", () => {
  it("returns the product images in display order", async () => {
    insertImage({ id: "img-b", productId: "p-ring", rank: 1, url: "back.webp" })
    insertImage({ createdAt: LATER, id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })
    insertImage({ id: "img-c", productId: "p-necklace", rank: 0, url: "necklace.webp" })

    const rows = await getProductImagesQuery.execute({ productId: "p-ring" })

    expect(rows.map((row) => row.url)).toStrictEqual(["front.webp", "back.webp"])
  })

  it("returns nothing for a product with no images", async () => {
    await expect(getProductImagesQuery.execute({ productId: "p-ring" })).resolves.toStrictEqual([])
  })
})

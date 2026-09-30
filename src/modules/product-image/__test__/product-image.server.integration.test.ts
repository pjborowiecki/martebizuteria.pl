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
const { deleteByIds, getFirstImageUrl, getProductIdsForImageIds, getProductImagesQuery, insertRows, updateProductThumbnail } =
  await import("~/src/modules/product-image/product-image.server")

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

const readThumbnail = (id: string): unknown => sqlite.prepare(`select thumbnail from product where id = ?`).get(id)?.["thumbnail"]

const imageIds = (): unknown[] =>
  sqlite
    .prepare(`select id from product_image order by id`)
    .all()
    .map((row) => row["id"])

beforeEach(() => {
  createTables(sqlite, TABLES)
  insertProduct("p-ring", "old-thumb.webp")
  insertProduct("p-necklace", null)
})

afterAll(() => {
  sqlite.close()
})

describe("getFirstImageUrl", () => {
  it("returns the lowest ranked image of the product", async () => {
    insertImage({ id: "img-b", productId: "p-ring", rank: 1, url: "back.webp" })
    insertImage({ createdAt: LATER, id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })

    await expect(getFirstImageUrl("p-ring")).resolves.toBe("front.webp")
  })

  it("breaks a rank tie by the older row", async () => {
    insertImage({ createdAt: LATER, id: "img-new", productId: "p-ring", rank: 0, url: "new.webp" })
    insertImage({ id: "img-old", productId: "p-ring", rank: 0, url: "old.webp" })

    await expect(getFirstImageUrl("p-ring")).resolves.toBe("old.webp")
  })

  it("ignores images that belong to another product", async () => {
    insertImage({ id: "img-other", productId: "p-necklace", rank: 0, url: "necklace.webp" })

    await expect(getFirstImageUrl("p-ring")).resolves.toBeUndefined()
  })

  it("has nothing to return for a product without images", async () => {
    await expect(getFirstImageUrl("p-ring")).resolves.toBeUndefined()
  })
})

describe("updateProductThumbnail", () => {
  it("points the thumbnail at the given url", async () => {
    await updateProductThumbnail("p-ring", "front.webp")

    expect(readThumbnail("p-ring")).toBe("front.webp")
  })

  it("clears the thumbnail when there is no image left", async () => {
    await updateProductThumbnail("p-ring", undefined)

    expect(readThumbnail("p-ring")).toBeNull()
  })

  it("leaves other products untouched", async () => {
    await updateProductThumbnail("p-ring", "front.webp")

    expect(readThumbnail("p-necklace")).toBeNull()
  })
})

describe("deleteByIds", () => {
  it("removes exactly the rows it was given", async () => {
    insertImage({ id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })
    insertImage({ id: "img-b", productId: "p-ring", rank: 1, url: "back.webp" })
    insertImage({ id: "img-c", productId: "p-necklace", rank: 0, url: "necklace.webp" })

    await deleteByIds(["img-a", "img-c"])

    expect(imageIds()).toStrictEqual(["img-b"])
  })

  it("touches nothing when asked to delete nothing", async () => {
    insertImage({ id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })

    await deleteByIds([])

    expect(imageIds()).toStrictEqual(["img-a"])
  })
})

describe("getProductIdsForImageIds", () => {
  it("collapses several images of one product into a single product id", async () => {
    insertImage({ id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })
    insertImage({ id: "img-b", productId: "p-ring", rank: 1, url: "back.webp" })

    await expect(getProductIdsForImageIds(["img-a", "img-b"])).resolves.toStrictEqual(["p-ring"])
  })

  it("reports every product the images belong to", async () => {
    insertImage({ id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" })
    insertImage({ id: "img-c", productId: "p-necklace", rank: 0, url: "necklace.webp" })

    const productIds = await getProductIdsForImageIds(["img-a", "img-c"])

    expect([...productIds].toSorted()).toStrictEqual(["p-necklace", "p-ring"])
  })

  it("does not query at all for an empty id list", async () => {
    await expect(getProductIdsForImageIds([])).resolves.toStrictEqual([])
  })

  it("skips ids that no longer exist", async () => {
    await expect(getProductIdsForImageIds(["img-gone"])).resolves.toStrictEqual([])
  })
})

describe("insertRows", () => {
  it("stores every row it is handed", async () => {
    await insertRows([
      { id: "img-a", productId: "p-ring", rank: 0, url: "front.webp" },
      { id: "img-b", productId: "p-ring", rank: 1, url: "back.webp" },
    ])

    expect(imageIds()).toStrictEqual(["img-a", "img-b"])
  })

  it("writes nothing for an empty batch", async () => {
    await insertRows([])

    expect(imageIds()).toStrictEqual([])
  })
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

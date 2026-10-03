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
const { runDrizzleBatch } = await import("~/src/integrations/drizzle-orm/drizzle.batch")
const { prepareProductImagesBatch } = await import("~/src/modules/product-image/product-image.persist.utils")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const NOW = 1_770_000_000_000

const insertProduct = (id: string, handle: string): void => {
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, created_at, updated_at)
       values (?, ?, 0, 'draft', '{"en-US":"T"}', ?, ?)`,
    )
    .run(id, handle, NOW, NOW)
}

const insertImage = (input: { id: string; productId: string; rank: number; url: string }): void => {
  sqlite
    .prepare(
      `insert into product_image (id, product_id, variant_id, url, alt, rank, created_at, updated_at)
       values (?, ?, null, ?, null, ?, ?, ?)`,
    )
    .run(input.id, input.productId, input.url, input.rank, NOW, NOW)
}

const saveImages = (productId: string, images: Parameters<typeof prepareProductImagesBatch>[1]): Promise<void> =>
  runDrizzleBatch(prepareProductImagesBatch(productId, images))

const thumbnailOf = (productId: string): unknown =>
  sqlite.prepare("select thumbnail from product where id = ?").get(productId)?.["thumbnail"]

const imageRows = (productId: string): Record<string, unknown>[] =>
  sqlite
    .prepare("select id, url, rank, alt from product_image where product_id = ? order by rank")
    .all(productId)
    .map((row) => Object.fromEntries(Object.entries(row)))

beforeEach(() => {
  createTables(sqlite, [product, productVariant, productImage])
  insertProduct("p1", "silver-ring")
  insertProduct("p2", "gold-chain")
})

afterAll(() => {
  sqlite.close()
})

describe("prepareProductImagesBatch", () => {
  it("swaps the stored images for the supplied ones and refreshes the thumbnail", async () => {
    insertImage({ id: "old-1", productId: "p1", rank: 0, url: "old.jpg" })

    await saveImages("p1", [
      { id: "new-1", rank: 0, url: "new-first.jpg" },
      { alt: "side view", id: "new-2", rank: 1, url: "new-second.jpg" },
    ])

    expect(imageRows("p1")).toStrictEqual([
      { alt: null, id: "new-1", rank: 0, url: "new-first.jpg" },
      { alt: "side view", id: "new-2", rank: 1, url: "new-second.jpg" },
    ])
    expect(thumbnailOf("p1")).toBe("new-first.jpg")
  })

  it("promotes the lowest ranked image to the thumbnail whatever order it arrives in", async () => {
    await saveImages("p1", [
      { id: "img-2", rank: 1, url: "second.jpg" },
      { id: "img-1", rank: 0, url: "first.jpg" },
    ])

    expect(thumbnailOf("p1")).toBe("first.jpg")
  })

  it("stores a gallery larger than one insert statement can carry", async () => {
    const gallery = Array.from({ length: 30 }, (_, rank) => ({
      alt: `view ${String(rank)}`,
      id: `img-${String(rank)}`,
      rank,
      url: `${String(rank)}.jpg`,
    }))

    await saveImages("p1", gallery)

    expect(imageRows("p1")).toStrictEqual(gallery.map(({ alt, id, rank, url }) => ({ alt, id, rank, url })))
    expect(thumbnailOf("p1")).toBe("0.jpg")
  })

  it("stores no alt text for an empty caption", async () => {
    await saveImages("p1", [{ alt: "", id: "new-1", rank: 0, url: "new.jpg" }])

    expect(imageRows("p1")).toStrictEqual([{ alt: null, id: "new-1", rank: 0, url: "new.jpg" }])
  })

  it("generates an id for an image that arrives without one", async () => {
    await saveImages("p1", [{ rank: 0, url: "generated.jpg" }])

    const [row] = imageRows("p1")

    expect(row?.["url"]).toBe("generated.jpg")
    expect(row?.["id"]).toStrictEqual(expect.any(String))
  })

  it("removes every image and clears the thumbnail for an empty list", async () => {
    insertImage({ id: "old-1", productId: "p1", rank: 0, url: "old.jpg" })
    sqlite.prepare("update product set thumbnail = 'old.jpg' where id = 'p1'").run()

    await saveImages("p1", [])

    expect(imageRows("p1")).toStrictEqual([])
    expect(thumbnailOf("p1")).toBeNull()
  })

  it("leaves another product's images and thumbnail untouched", async () => {
    insertImage({ id: "other-1", productId: "p2", rank: 0, url: "other.jpg" })
    sqlite.prepare("update product set thumbnail = 'other.jpg' where id = 'p2'").run()

    await saveImages("p1", [{ id: "new-1", rank: 0, url: "new.jpg" }])

    expect(imageRows("p2")).toStrictEqual([{ alt: null, id: "other-1", rank: 0, url: "other.jpg" }])
    expect(thumbnailOf("p2")).toBe("other.jpg")
  })
})

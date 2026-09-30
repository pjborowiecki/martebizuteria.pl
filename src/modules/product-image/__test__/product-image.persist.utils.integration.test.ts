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
const { replaceProductImages, syncProductThumbnail, syncThumbnailsForProductIds } =
  await import("~/src/modules/product-image/product-image.persist.utils")

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

describe("syncProductThumbnail", () => {
  it("promotes the lowest ranked image to the thumbnail", async () => {
    insertImage({ id: "img-2", productId: "p1", rank: 1, url: "second.jpg" })
    insertImage({ id: "img-1", productId: "p1", rank: 0, url: "first.jpg" })

    await syncProductThumbnail("p1")

    expect(thumbnailOf("p1")).toBe("first.jpg")
  })

  it("clears the thumbnail when the product has no image left", async () => {
    sqlite.prepare("update product set thumbnail = 'stale.jpg' where id = 'p1'").run()

    await syncProductThumbnail("p1")

    expect(thumbnailOf("p1")).toBeNull()
  })

  it("ignores images that belong to another product", async () => {
    insertImage({ id: "img-1", productId: "p2", rank: 0, url: "other.jpg" })

    await syncProductThumbnail("p1")

    expect(thumbnailOf("p1")).toBeNull()
  })
})

describe("syncThumbnailsForProductIds", () => {
  it("refreshes the thumbnail of every product it is given", async () => {
    insertImage({ id: "img-1", productId: "p1", rank: 0, url: "one.jpg" })
    insertImage({ id: "img-2", productId: "p2", rank: 0, url: "two.jpg" })

    await syncThumbnailsForProductIds(["p1", "p2"])

    expect(thumbnailOf("p1")).toBe("one.jpg")
    expect(thumbnailOf("p2")).toBe("two.jpg")
  })

  it("does nothing for an empty list", async () => {
    sqlite.prepare("update product set thumbnail = 'kept.jpg' where id = 'p1'").run()

    await syncThumbnailsForProductIds([])

    expect(thumbnailOf("p1")).toBe("kept.jpg")
  })
})

describe("replaceProductImages", () => {
  it("swaps the stored images for the supplied ones and refreshes the thumbnail", async () => {
    insertImage({ id: "old-1", productId: "p1", rank: 0, url: "old.jpg" })

    await replaceProductImages("p1", [
      { id: "new-1", rank: 0, url: "new-first.jpg" },
      { alt: "side view", id: "new-2", rank: 1, url: "new-second.jpg" },
    ])

    expect(imageRows("p1")).toStrictEqual([
      { alt: null, id: "new-1", rank: 0, url: "new-first.jpg" },
      { alt: "side view", id: "new-2", rank: 1, url: "new-second.jpg" },
    ])
    expect(thumbnailOf("p1")).toBe("new-first.jpg")
  })

  it("stores no alt text for an empty caption", async () => {
    await replaceProductImages("p1", [{ alt: "", id: "new-1", rank: 0, url: "new.jpg" }])

    expect(imageRows("p1")).toStrictEqual([{ alt: null, id: "new-1", rank: 0, url: "new.jpg" }])
  })

  it("generates an id for an image that arrives without one", async () => {
    await replaceProductImages("p1", [{ rank: 0, url: "generated.jpg" }])

    const [row] = imageRows("p1")

    expect(row?.["url"]).toBe("generated.jpg")
    expect(row?.["id"]).toStrictEqual(expect.any(String))
  })

  it("removes every image and clears the thumbnail for an empty list", async () => {
    insertImage({ id: "old-1", productId: "p1", rank: 0, url: "old.jpg" })
    await syncProductThumbnail("p1")

    await replaceProductImages("p1", [])

    expect(imageRows("p1")).toStrictEqual([])
    expect(thumbnailOf("p1")).toBeNull()
  })

  it("leaves another product's images untouched", async () => {
    insertImage({ id: "other-1", productId: "p2", rank: 0, url: "other.jpg" })

    await replaceProductImages("p1", [{ id: "new-1", rank: 0, url: "new.jpg" }])

    expect(imageRows("p2")).toStrictEqual([{ alt: null, id: "other-1", rank: 0, url: "other.jpg" }])
  })
})

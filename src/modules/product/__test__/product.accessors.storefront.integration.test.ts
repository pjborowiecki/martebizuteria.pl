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
const {
  getAdminProductDetailByIdQuery,
  getProductByHandleQuery,
  getProductsWithInventoryByHandles,
  getPublishedProductByHandleQuery,
  getPublishedProductsByCategoryIds,
  getPublishedProductsByCollectionId,
  getPublishedProductsInStock,
  getPublishedRelatedProducts,
} = await import("~/src/modules/product/product.accessors")

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

const titlesJson = (title: string): string => JSON.stringify({ "en-US": title, "pl-PL": title })

const insertProduct = (input: {
  handle: string
  id: string
  rank?: number
  status?: "archived" | "draft" | "published"
  title: string
}): void => {
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(input.id, input.handle, input.rank ?? 0, input.status ?? "published", titlesJson(input.title), NOW, NOW)
}

const insertVariant = (input: { id: string; price: number; productId: string; stock: number | null }): void => {
  sqlite
    .prepare(
      `insert into product_variant (id, product_id, sku, title, price, manage_inventory, created_at, updated_at)
       values (?, ?, null, 'Default', ?, 1, ?, ?)`,
    )
    .run(input.id, input.productId, input.price, NOW, NOW)
  if (input.stock !== null) {
    sqlite
      .prepare(
        `insert into inventory (id, variant_id, quantity_available, quantity_reserved, version, created_at, updated_at)
         values (?, ?, ?, 0, 1, ?, ?)`,
      )
      .run(`inv-${input.id}`, input.id, input.stock, NOW, NOW)
  }
}

const insertCategory = (id: string, handle: string): void => {
  sqlite
    .prepare(
      `insert into product_category (id, handle, titles, status, rank, created_at, updated_at)
       values (?, ?, ?, 'active', 0, ?, ?)`,
    )
    .run(id, handle, titlesJson(handle), NOW, NOW)
}

const insertCollection = (id: string, handle: string): void => {
  sqlite
    .prepare(
      `insert into product_collection (id, handle, titles, status, rank, created_at, updated_at)
       values (?, ?, ?, 'active', 0, ?, ?)`,
    )
    .run(id, handle, titlesJson(handle), NOW, NOW)
}

const linkCategory = (categoryId: string, productId: string): void => {
  sqlite.prepare("insert into category_on_product (category_id, product_id, is_primary) values (?, ?, 1)").run(categoryId, productId)
}

const linkCollection = (collectionId: string, productId: string): void => {
  sqlite.prepare("insert into collection_on_product (collection_id, product_id, rank) values (?, ?, 0)").run(collectionId, productId)
}

const insertImage = (input: { id: string; productId: string; rank: number; url: string }): void => {
  sqlite
    .prepare(
      `insert into product_image (id, product_id, variant_id, url, alt, rank, created_at, updated_at)
       values (?, ?, null, ?, null, ?, ?, ?)`,
    )
    .run(input.id, input.productId, input.url, input.rank, NOW, NOW)
}

const idsOf = (rows: readonly { readonly id: string }[]): string[] => rows.map((row) => row.id)

const PAGE = { limit: 10, offset: 0 }

const seed = (): void => {
  insertProduct({ handle: "silver-ring", id: "p1", rank: 0, title: "Silver ring" })
  insertProduct({ handle: "gold-chain", id: "p2", rank: 1, title: "Gold chain" })
  insertProduct({ handle: "sold-out-cuff", id: "p3", rank: 2, title: "Sold out cuff" })
  insertProduct({ handle: "draft-pin", id: "p4", rank: 3, status: "draft", title: "Draft pin" })
  insertVariant({ id: "v1", price: 9900, productId: "p1", stock: 4 })
  insertVariant({ id: "v2", price: 4900, productId: "p2", stock: 2 })
  insertVariant({ id: "v3", price: 19_900, productId: "p3", stock: 0 })
  insertVariant({ id: "v4", price: 2900, productId: "p4", stock: 8 })
}

beforeEach(() => {
  createTables(sqlite, TABLES)
  seed()
})

afterAll(() => {
  sqlite.close()
})

describe("getPublishedProductsInStock", () => {
  it("lists published products that still have stock, by rank", async () => {
    await expect(getPublishedProductsInStock().then(idsOf)).resolves.toStrictEqual(["p1", "p2"])
  })

  it("drops a product once its stock reaches zero", async () => {
    sqlite.prepare("update inventory set quantity_available = 0 where variant_id = 'v1'").run()

    await expect(getPublishedProductsInStock().then(idsOf)).resolves.toStrictEqual(["p2"])
  })

  it("carries only the storefront variant columns", async () => {
    const [first] = await getPublishedProductsInStock()

    expect(first?.variants[0]).toStrictEqual({ id: "v1", price: 9900, productId: "p1", title: "Default" })
  })
})

describe("getProductsWithInventoryByHandles", () => {
  it("loads each requested handle with its variants and inventory", async () => {
    const rows = await getProductsWithInventoryByHandles(["silver-ring", "draft-pin"])

    expect(rows.map((row) => row.handle).toSorted()).toStrictEqual(["draft-pin", "silver-ring"])
    expect(rows.find((row) => row.id === "p1")?.variants[0]?.inventory.quantityAvailable).toBe(4)
  })

  it("reports a null inventory for a variant that has none", async () => {
    insertProduct({ handle: "no-stock-row", id: "p5", title: "No stock row" })
    insertVariant({ id: "v5", price: 1000, productId: "p5", stock: null })

    const [row] = await getProductsWithInventoryByHandles(["no-stock-row"])

    expect(row?.variants[0]?.inventory).toBeNull()
  })

  it("returns nothing for handles that do not exist", async () => {
    await expect(getProductsWithInventoryByHandles(["missing"])).resolves.toStrictEqual([])
  })
})

describe("getProductByHandleQuery", () => {
  it("loads the whole admin graph for a handle regardless of status", async () => {
    insertCategory("cat-1", "rings")
    insertCollection("col-1", "sale")
    linkCategory("cat-1", "p4")
    linkCollection("col-1", "p4")
    insertImage({ id: "img-2", productId: "p4", rank: 1, url: "second.jpg" })
    insertImage({ id: "img-1", productId: "p4", rank: 0, url: "first.jpg" })

    const row = await getProductByHandleQuery.execute({ handle: "draft-pin" })

    expect(row?.id).toBe("p4")
    expect(row?.images.map((image) => image.url)).toStrictEqual(["first.jpg", "second.jpg"])
    expect(row?.categories[0]?.productCategory.handle).toBe("rings")
    expect(row?.collections[0]?.productCollection.handle).toBe("sale")
    expect(row?.variants).toHaveLength(1)
  })

  it("returns nothing for an unknown handle", async () => {
    await expect(getProductByHandleQuery.execute({ handle: "nope" })).resolves.toBeUndefined()
  })
})

describe("getAdminProductDetailByIdQuery", () => {
  it("loads a product by its id with the attribute definitions attached to its variants", async () => {
    sqlite
      .prepare(
        `insert into product_attribute (id, handle, titles, type, rank, created_at, updated_at)
         values ('attr-1', 'material', ?, 'text', 0, ?, ?)`,
      )
      .run(titlesJson("Material"), NOW, NOW)
    sqlite
      .prepare(
        `insert into attribute_on_product (id, attribute_id, product_id, variant_id, rank, value, created_at, updated_at)
         values ('aop-1', 'attr-1', 'p1', 'v1', 0, 'silver', ?, ?)`,
      )
      .run(NOW, NOW)

    const row = await getAdminProductDetailByIdQuery.execute({ id: "p1" })

    expect(row?.handle).toBe("silver-ring")
    expect(row?.variants[0]?.attributes[0]?.productAttribute.handle).toBe("material")
    expect(row?.variants[0]?.inventory.quantityAvailable).toBe(4)
  })

  it("returns nothing for an unknown id", async () => {
    await expect(getAdminProductDetailByIdQuery.execute({ id: "missing" })).resolves.toBeUndefined()
  })
})

describe("getPublishedProductByHandleQuery", () => {
  it("loads a published product with its option values in rank order", async () => {
    sqlite
      .prepare(
        `insert into product_option (id, product_id, titles, created_at, updated_at)
         values ('o1', 'p1', ?, ?, ?)`,
      )
      .run(titlesJson("Size"), NOW, NOW)
    sqlite
      .prepare(
        `insert into product_option_value (id, option_id, labels, rank, created_at, updated_at)
         values ('ov2', 'o1', ?, 1, ?, ?), ('ov1', 'o1', ?, 0, ?, ?)`,
      )
      .run(titlesJson("L"), NOW, NOW, titlesJson("M"), NOW, NOW)

    const row = await getPublishedProductByHandleQuery.execute({ handle: "silver-ring" })

    expect(row?.options[0]?.values.map((value) => value.id)).toStrictEqual(["ov1", "ov2"])
  })

  it("refuses to serve an unpublished product", async () => {
    await expect(getPublishedProductByHandleQuery.execute({ handle: "draft-pin" })).resolves.toBeUndefined()
  })
})

describe("getPublishedProductsByCategoryIds", () => {
  beforeEach(() => {
    insertCategory("cat-1", "rings")
    insertCategory("cat-2", "chains")
    linkCategory("cat-1", "p1")
    linkCategory("cat-2", "p2")
    linkCategory("cat-1", "p3")
    linkCategory("cat-1", "p4")
  })

  it("skips the database entirely for an empty category list", async () => {
    await expect(getPublishedProductsByCategoryIds([], PAGE)).resolves.toStrictEqual({ items: [], total: 0 })
  })

  it("returns only published in-stock products of the given categories", async () => {
    const page = await getPublishedProductsByCategoryIds(["cat-1"], PAGE)

    expect(idsOf(page.items)).toStrictEqual(["p1"])
    expect(page.total).toBe(1)
  })

  it("counts a product once even when several requested categories hold it", async () => {
    linkCategory("cat-2", "p1")

    const page = await getPublishedProductsByCategoryIds(["cat-1", "cat-2"], PAGE)

    expect(idsOf(page.items)).toStrictEqual(["p1", "p2"])
    expect(page.total).toBe(2)
  })

  it("reports the full total while returning only the requested window", async () => {
    linkCategory("cat-1", "p2")

    const page = await getPublishedProductsByCategoryIds(["cat-1"], { limit: 1, offset: 1 })

    expect(idsOf(page.items)).toStrictEqual(["p2"])
    expect(page.total).toBe(2)
  })

  it("returns an empty page past the end while keeping the total", async () => {
    const page = await getPublishedProductsByCategoryIds(["cat-1"], { limit: 5, offset: 5 })

    expect(page).toStrictEqual({ items: [], total: 1 })
  })
})

describe("getPublishedProductsByCollectionId", () => {
  it("returns the published in-stock products of a collection", async () => {
    insertCollection("col-1", "sale")
    linkCollection("col-1", "p1")
    linkCollection("col-1", "p3")

    const page = await getPublishedProductsByCollectionId("col-1", PAGE)

    expect(idsOf(page.items)).toStrictEqual(["p1"])
    expect(page.total).toBe(1)
  })

  it("returns an empty page for a collection with nothing sellable", async () => {
    insertCollection("col-2", "empty")

    await expect(getPublishedProductsByCollectionId("col-2", PAGE)).resolves.toStrictEqual({ items: [], total: 0 })
  })
})

describe("getPublishedRelatedProducts", () => {
  it("returns the other sellable products of the category by rank", async () => {
    insertCategory("cat-1", "rings")
    linkCategory("cat-1", "p1")
    linkCategory("cat-1", "p2")
    linkCategory("cat-1", "p3")
    linkCategory("cat-1", "p4")

    await expect(getPublishedRelatedProducts("cat-1", "p1").then(idsOf)).resolves.toStrictEqual(["p2"])
  })

  it("never returns the product it was asked to exclude", async () => {
    insertCategory("cat-1", "rings")
    linkCategory("cat-1", "p1")
    linkCategory("cat-1", "p2")

    await expect(getPublishedRelatedProducts("cat-1", "p2").then(idsOf)).resolves.toStrictEqual(["p1"])
  })

  it("stops at three related products", async () => {
    insertCategory("cat-1", "rings")
    linkCategory("cat-1", "p1")
    for (const index of [1, 2, 3, 4]) {
      const id = `extra-${index}`
      insertProduct({ handle: id, id, rank: 10 + index, title: id })
      insertVariant({ id: `var-${index}`, price: 1000, productId: id, stock: 3 })
      linkCategory("cat-1", id)
    }

    await expect(getPublishedRelatedProducts("cat-1", "p1").then(idsOf)).resolves.toStrictEqual(["extra-1", "extra-2", "extra-3"])
  })

  it("returns nothing when the category holds no other sellable product", async () => {
    insertCategory("cat-1", "rings")
    linkCategory("cat-1", "p1")

    await expect(getPublishedRelatedProducts("cat-1", "p1")).resolves.toStrictEqual([])
  })
})

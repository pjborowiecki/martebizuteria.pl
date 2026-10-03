import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { database, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { database: { dropsCountRows: false }, sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")
  const client = new Proxy(createTestD1Database(sqlite), {
    get: (target, property, receiver) => {
      if (property === "prepare") {
        return (query: string) =>
          target.prepare(database.dropsCountRows && query.startsWith("select count(") ? `select * from (${query}) where 0` : query)
      }
      const value: unknown = Reflect.get(target, property, receiver)

      return value
    },
  })

  return { db: drizzle(client, { schema }) }
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
  getAdminProductsFilteredList,
  getAdminProductsPage,
  getLowStockPublishedProductCountQuery,
  getMaxRankQuery,
  getProductStatusCountsQuery,
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

const idsOf = (rows: readonly { readonly id: string }[]): string[] => rows.map((row) => row.id)

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

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

const PAGE = { limit: 10, offset: 0 }

beforeEach(() => {
  database.dropsCountRows = false
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

describe("literal product SKU search", () => {
  it.each(["RING_1", "RING%1", String.raw`RING\1`])("matches %s without interpreting its special characters", async (sku) => {
    sqlite.prepare("update product_variant set sku = ? where id = 'v1b'").run(sku)
    sqlite.prepare("update product_variant set sku = ? where id = 'v2'").run("RINGX1")

    const result = await getAdminProductsPage({ ...PAGE, search: sku })

    expect(idsOf(result.rows)).toStrictEqual(["p1"])
    expect(result.total).toBe(1)
  })
})

describe("getAdminProductsPage without variant statistics", () => {
  it("returns every product newest-edited first with the total", async () => {
    const page = await getAdminProductsPage(PAGE)

    expect(page.total).toBe(4)
    expect(idsOf(page.rows)).toStrictEqual(["p1", "p3", "p4", "p2"])
  })

  it("pages through the list while still reporting the full total", async () => {
    const page = await getAdminProductsPage({ limit: 2, offset: 2 })

    expect(page.total).toBe(4)
    expect(idsOf(page.rows)).toStrictEqual(["p4", "p2"])
  })

  it("returns no rows past the end of the list", async () => {
    const page = await getAdminProductsPage({ limit: 2, offset: 10 })

    expect(page.rows).toStrictEqual([])
    expect(page.total).toBe(4)
  })

  it("narrows to a single status", async () => {
    const page = await getAdminProductsPage({ ...PAGE, status: "draft" })

    expect(page.total).toBe(1)
    expect(idsOf(page.rows)).toStrictEqual(["p3"])
  })

  it("matches the search term against the handle", async () => {
    const page = await getAdminProductsPage({ ...PAGE, search: "gold-chain" })

    expect(idsOf(page.rows)).toStrictEqual(["p2"])
  })

  it("matches the search term against a variant SKU", async () => {
    const page = await getAdminProductsPage({ ...PAGE, search: "CUFF-1" })

    expect(idsOf(page.rows)).toStrictEqual(["p3"])
  })

  it("filters to the products created on one day", async () => {
    const page = await getAdminProductsPage({
      ...PAGE,
      createdAt: { date: isoDay(NOW - DAY), operator: "on" },
    })

    expect(idsOf(page.rows)).toStrictEqual(["p2"])
  })

  it("filters to the products created before a day", async () => {
    const page = await getAdminProductsPage({ ...PAGE, createdAt: { date: isoDay(NOW), operator: "before" } })

    expect(idsOf(page.rows)).toStrictEqual(["p2"])
  })

  it("filters to the products created after a day", async () => {
    const page = await getAdminProductsPage({ ...PAGE, createdAt: { date: isoDay(NOW - DAY), operator: "after" } })

    expect(idsOf(page.rows).toSorted()).toStrictEqual(["p1", "p3", "p4"])
  })

  it("filters to the products created inside a day range", async () => {
    const page = await getAdminProductsPage({
      ...PAGE,
      createdAt: { endDate: isoDay(NOW), operator: "between", startDate: isoDay(NOW - DAY) },
    })

    expect(idsOf(page.rows).toSorted()).toStrictEqual(["p1", "p2", "p3", "p4"])
  })

  it("filters to the products of one category", async () => {
    insertCategory("cat-1", "rings")
    linkCategory("cat-1", "p1")

    const page = await getAdminProductsPage({ ...PAGE, categoryId: "cat-1" })

    expect(page.total).toBe(1)
    expect(idsOf(page.rows)).toStrictEqual(["p1"])
  })

  it("filters to the products of one collection", async () => {
    insertCollection("col-1", "sale")
    linkCollection("col-1", "p2")

    const page = await getAdminProductsPage({ ...PAGE, collectionId: "col-1" })

    expect(idsOf(page.rows)).toStrictEqual(["p2"])
  })

  it("combines a category and a collection filter", async () => {
    insertCategory("cat-1", "rings")
    insertCollection("col-1", "sale")
    linkCategory("cat-1", "p1")
    linkCollection("col-1", "p2")

    const page = await getAdminProductsPage({ ...PAGE, categoryId: "cat-1", collectionId: "col-1" })

    expect(page.rows).toStrictEqual([])
    expect(page.total).toBe(0)
  })

  it.each([
    ["title", false, ["p3", "p2", "p1"]],
    ["recordId", true, ["p3", "p2", "p1"]],
    ["status", false, ["p3", "p1", "p2"]],
    ["createdAt", false, ["p2", "p1", "p3"]],
    ["editedAt", false, ["p2", "p1", "p3"]],
  ])("sorts the list by %s", async (columnId, desc, expected) => {
    sqlite.prepare("delete from product where id = 'p4'").run()

    const page = await getAdminProductsPage({ ...PAGE, sort: { columnId, desc } })

    expect(idsOf(page.rows)).toStrictEqual(expected)
  })

  it("falls back to the newest edit for a column it cannot sort on the server", async () => {
    const page = await getAdminProductsPage({ ...PAGE, sort: { columnId: "image", desc: false } })

    expect(idsOf(page.rows)).toStrictEqual(["p1", "p3", "p4", "p2"])
  })
})

describe("getAdminProductsPage with variant statistics", () => {
  it("keeps only published products that are out of stock", async () => {
    const page = await getAdminProductsPage({ ...PAGE, inventoryLevel: "out" })

    expect(idsOf(page.rows)).toStrictEqual(["p2"])
    expect(page.total).toBe(1)
  })

  it("keeps published products inside the low stock band", async () => {
    sqlite.prepare("update inventory set quantity_available = 1 where variant_id = 'v1b'").run()

    const page = await getAdminProductsPage({ ...PAGE, inventoryLevel: "low" })

    expect(idsOf(page.rows)).toStrictEqual(["p1"])
  })

  it("treats unpublished products as healthy stock", async () => {
    const page = await getAdminProductsPage({ ...PAGE, inventoryLevel: "ok" })

    expect(idsOf(page.rows)).toStrictEqual(["p1", "p3", "p4"])
  })

  it("filters on the cheapest variant price", async () => {
    const page = await getAdminProductsPage({ ...PAGE, minPrice: { amountMinorUnits: 9900, operator: "gte" } })

    expect(idsOf(page.rows)).toStrictEqual(["p1", "p3"])
  })

  it("filters on the summed stock", async () => {
    const page = await getAdminProductsPage({ ...PAGE, totalStock: { amountMinorUnits: 24, operator: "eq" } })

    expect(idsOf(page.rows)).toStrictEqual(["p1"])
  })

  it("separates single-variant products from multi-variant ones", async () => {
    const single = await getAdminProductsPage({ ...PAGE, variantKind: "single" })
    const multi = await getAdminProductsPage({ ...PAGE, variantKind: "multi" })

    expect(idsOf(single.rows)).toStrictEqual(["p3", "p4", "p2"])
    expect(idsOf(multi.rows)).toStrictEqual(["p1"])
  })

  it("sorts by the cheapest variant price", async () => {
    const page = await getAdminProductsPage({ ...PAGE, sort: { columnId: "minPrice", desc: false } })

    expect(idsOf(page.rows)).toStrictEqual(["p4", "p2", "p1", "p3"])
  })

  it("sorts by the summed stock", async () => {
    const page = await getAdminProductsPage({ ...PAGE, sort: { columnId: "stock", desc: true } })

    expect(idsOf(page.rows).slice(0, 2)).toStrictEqual(["p3", "p1"])
  })

  it("sorts by how many variants a product has", async () => {
    const page = await getAdminProductsPage({ ...PAGE, sort: { columnId: "variantKind", desc: true } })

    expect(idsOf(page.rows).at(0)).toBe("p1")
  })

  it("returns nothing and a zero total when the joined filters exclude everything", async () => {
    const page = await getAdminProductsPage({ ...PAGE, totalStock: { amountMinorUnits: 9999, operator: "gt" } })

    expect(page.rows).toStrictEqual([])
    expect(page.total).toBe(0)
  })
})

describe("getAdminProductsFilteredList", () => {
  it("returns every matching row without a page window", async () => {
    await expect(getAdminProductsFilteredList({}).then(idsOf)).resolves.toStrictEqual(["p1", "p3", "p4", "p2"])
  })

  it("honours the same filters as the paged list", async () => {
    await expect(getAdminProductsFilteredList({ status: "published" }).then(idsOf)).resolves.toStrictEqual(["p1", "p2"])
  })

  it("carries the localized titles of the linked category, collection and attribute", async () => {
    insertCategory("cat-1", "rings")
    insertCollection("col-1", "sale")
    linkCategory("cat-1", "p1")
    linkCollection("col-1", "p1")
    sqlite
      .prepare(
        `insert into product_attribute (id, handle, titles, type, rank, created_at, updated_at)
         values ('attr-1', 'material', ?, 'text', 0, ?, ?)`,
      )
      .run(titlesJson("Material"), NOW, NOW)
    sqlite
      .prepare(
        `insert into attribute_on_product (id, attribute_id, product_id, rank, value, created_at, updated_at)
         values ('aop-1', 'attr-1', 'p1', 0, 'silver', ?, ?)`,
      )
      .run(NOW, NOW)

    const [first] = await getAdminProductsFilteredList({ search: "silver-ring" })

    expect(first?.categories.map((link) => link.productCategory.titles["en-US"])).toStrictEqual(["rings"])
    expect(first?.collections.map((link) => link.productCollection.titles["en-US"])).toStrictEqual(["sale"])
    expect(first?.attributes.map((link) => link.productAttribute.titles["en-US"])).toStrictEqual(["Material"])
  })
})

describe("getAdminProductsPage without a count row", () => {
  it("still lists the page and reports a zero total", async () => {
    database.dropsCountRows = true

    const page = await getAdminProductsPage(PAGE)

    expect(idsOf(page.rows)).toStrictEqual(["p1", "p3", "p4", "p2"])
    expect(page.total).toBe(0)
  })
})

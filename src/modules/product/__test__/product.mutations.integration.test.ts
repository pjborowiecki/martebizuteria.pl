import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type ProductCatalogReplacePayload } from "~/src/modules/product/product.utils"

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

const { categoryOnProduct } = await import("~/src/modules/category-on-product/category-on-product.schema")
const { collectionOnProduct } = await import("~/src/modules/collection-on-product/collection-on-product.schema")
const { inventory } = await import("~/src/modules/inventory/inventory.schema")
const { optionOnVariant } = await import("~/src/modules/option-on-variant/option-on-variant.schema")
const { orderItem } = await import("~/src/modules/order-item/order-item.schema")
const { productCategory } = await import("~/src/modules/product-category/product-category.schema")
const { productCollection } = await import("~/src/modules/product-collection/product-collection.schema")
const { productOptionValue } = await import("~/src/modules/product-option-value/product-option-value.schema")
const { productOption } = await import("~/src/modules/product-option/product-option.schema")
const { productVariant } = await import("~/src/modules/product-variant/product-variant.schema")
const { product } = await import("~/src/modules/product/product.schema")
const { deleteProducts, findTakenSkus, replaceProductCatalog, replaceProductOrganization, setProductRanks } =
  await import("~/src/modules/product/product.mutations")

const { createTables } = await import("./product-sqlite-schema")

const TABLES = [
  productCategory,
  productCollection,
  product,
  productVariant,
  inventory,
  productOption,
  productOptionValue,
  optionOnVariant,
  categoryOnProduct,
  collectionOnProduct,
  orderItem,
]

const NOW = Date.now()

const LOCALE_MAP = { "en-US": "Size", "pl-PL": "Rozmiar" }

const VALUE_MAP = { "en-US": "M", "pl-PL": "M" }

const CATALOG_PAYLOAD: ProductCatalogReplacePayload = {
  inventoryRows: [{ id: "i1", quantityAvailable: 4, variantId: "v-new" }],
  optionOnVariantRows: [{ id: "ov1", optionId: "o1", valueId: "ovl1", variantId: "v-new" }],
  optionRows: [{ id: "o1", productId: "p1", titles: LOCALE_MAP }],
  optionValueRows: [{ id: "ovl1", labels: VALUE_MAP, optionId: "o1", rank: 0 }],
  variantRows: [{ id: "v-new", price: 2500, productId: "p1", title: "M" }],
}

const insertProduct = (id: string, handle: string, rank: number): void => {
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, created_at, updated_at)
       values (?, ?, ?, 'draft', '{"en-US":"T"}', ?, ?)`,
    )
    .run(id, handle, rank, NOW, NOW)
}

const insertVariant = (id: string, productId: string, sku: string | null): void => {
  sqlite
    .prepare(
      `insert into product_variant (id, product_id, sku, title, price, manage_inventory, created_at, updated_at)
       values (?, ?, ?, 'Default', 1000, 1, ?, ?)`,
    )
    .run(id, productId, sku, NOW, NOW)
}

const rows = (statement: string): Record<string, unknown>[] =>
  sqlite
    .prepare(statement)
    .all()
    .map((row) => Object.fromEntries(Object.entries(row)))

const column = (statement: string, name: string): unknown[] => rows(statement).map((row) => row[name])

const resetDatabase = (): void => {
  sqlite.exec(`drop table if exists "order"; create table "order" (id text primary key, email text not null)`)
  createTables(sqlite, TABLES)
  sqlite
    .prepare(
      `insert into product_category (id, handle, titles, status, rank, created_at, updated_at)
       values ('cat-1', 'rings', '{"en-US":"Rings"}', 'draft', 0, ?, ?), ('cat-2', 'chains', '{"en-US":"Chains"}', 'draft', 0, ?, ?)`,
    )
    .run(NOW, NOW, NOW, NOW)
  sqlite
    .prepare(
      `insert into product_collection (id, handle, titles, status, rank, created_at, updated_at)
       values ('col-1', 'sale', '{"en-US":"Sale"}', 'draft', 0, ?, ?)`,
    )
    .run(NOW, NOW)
}

beforeEach(() => {
  resetDatabase()
})

afterAll(() => {
  sqlite.close()
})

describe("deleteProducts", () => {
  it("removes only the named products", async () => {
    insertProduct("p1", "one", 0)
    insertProduct("p2", "two", 1)
    insertProduct("p3", "three", 2)

    await deleteProducts(["p1", "p3"])

    expect(column("select id from product order by id", "id")).toStrictEqual(["p2"])
  })

  it("takes the variants and their inventory down with the product", async () => {
    insertProduct("p1", "one", 0)
    insertVariant("v1", "p1", "SKU-1")
    sqlite
      .prepare(
        `insert into inventory (id, variant_id, quantity_available, quantity_reserved, version, created_at, updated_at)
         values ('i1', 'v1', 5, 0, 1, ?, ?)`,
      )
      .run(NOW, NOW)

    await deleteProducts(["p1"])

    expect(rows("select id from product_variant")).toStrictEqual([])
    expect(rows("select id from inventory")).toStrictEqual([])
  })

  it("touches nothing for an empty selection", async () => {
    insertProduct("p1", "one", 0)

    await deleteProducts([])

    expect(rows("select id from product")).toHaveLength(1)
  })
})

describe("setProductRanks", () => {
  it("assigns each product the rank it was given in one statement", async () => {
    insertProduct("p1", "one", 0)
    insertProduct("p2", "two", 1)
    insertProduct("p3", "three", 2)

    await setProductRanks([
      { id: "p1", rank: 2 },
      { id: "p2", rank: 0 },
      { id: "p3", rank: 1 },
    ])

    expect(rows("select id, rank from product order by rank")).toStrictEqual([
      { id: "p2", rank: 0 },
      { id: "p3", rank: 1 },
      { id: "p1", rank: 2 },
    ])
  })

  it("leaves products outside the update at their old rank", async () => {
    insertProduct("p1", "one", 7)
    insertProduct("p2", "two", 9)

    await setProductRanks([{ id: "p1", rank: 0 }])

    expect(rows("select id, rank from product order by id")).toStrictEqual([
      { id: "p1", rank: 0 },
      { id: "p2", rank: 9 },
    ])
  })

  it("skips the database for an empty update", async () => {
    insertProduct("p1", "one", 3)

    await setProductRanks([])

    expect(rows("select rank from product")).toStrictEqual([{ rank: 3 }])
  })
})

describe("findTakenSkus", () => {
  beforeEach(() => {
    insertProduct("p1", "one", 0)
    insertProduct("p2", "two", 1)
    insertVariant("v1", "p1", "SKU-1")
    insertVariant("v2", "p1", null)
    insertVariant("v3", "p2", "SKU-2")
  })

  it("reports the SKUs already stored", async () => {
    await expect(findTakenSkus(["SKU-1", "SKU-2", "SKU-FREE"])).resolves.toStrictEqual(["SKU-1", "SKU-2"])
  })

  it("trims and de-duplicates the requested SKUs", async () => {
    await expect(findTakenSkus([" SKU-1 ", "SKU-1", ""])).resolves.toStrictEqual(["SKU-1"])
  })

  it("returns nothing when every requested SKU is blank", async () => {
    await expect(findTakenSkus(["", "   "])).resolves.toStrictEqual([])
  })

  it("ignores the variants of the product being edited", async () => {
    await expect(findTakenSkus(["SKU-1", "SKU-2"], "p1")).resolves.toStrictEqual(["SKU-2"])
  })

  it("still reports foreign SKUs when the edited product has no variants", async () => {
    insertProduct("p3", "three", 2)

    await expect(findTakenSkus(["SKU-1"], "p3")).resolves.toStrictEqual(["SKU-1"])
  })
})

describe("replaceProductCatalog", () => {
  it("swaps the old options and variants for the new ones in one batch", async () => {
    insertProduct("p1", "one", 0)
    insertVariant("v-old", "p1", "OLD")

    await replaceProductCatalog("p1", CATALOG_PAYLOAD)

    expect(column("select id from product_variant", "id")).toStrictEqual(["v-new"])
    expect(column("select id from product_option", "id")).toStrictEqual(["o1"])
    expect(column("select id from product_option_value", "id")).toStrictEqual(["ovl1"])
    expect(column("select variant_id from option_on_variant", "variant_id")).toStrictEqual(["v-new"])
    expect(column("select quantity_available from inventory", "quantity_available")).toStrictEqual([4])
  })

  it("clears the catalog when the new payload is empty", async () => {
    insertProduct("p1", "one", 0)
    insertVariant("v-old", "p1", "OLD")

    await replaceProductCatalog("p1", {
      inventoryRows: [],
      optionOnVariantRows: [],
      optionRows: [],
      optionValueRows: [],
      variantRows: [],
    })

    expect(rows("select id from product_variant")).toStrictEqual([])
    expect(rows("select id from product_option")).toStrictEqual([])
  })

  it("leaves another product's variants alone", async () => {
    insertProduct("p1", "one", 0)
    insertProduct("p2", "two", 1)
    insertVariant("v-other", "p2", "OTHER")

    await replaceProductCatalog("p1", CATALOG_PAYLOAD)

    expect(column("select id from product_variant order by id", "id")).toStrictEqual(["v-new", "v-other"])
  })
})

const variantRow = (id: string, sku: string | undefined): ProductCatalogReplacePayload["variantRows"][number] => ({
  id,
  price: 2500,
  productId: "p1",
  sku,
  title: id,
})

const stockRow = (variantId: string, quantityAvailable: number): ProductCatalogReplacePayload["inventoryRows"][number] => ({
  id: `inventory-${variantId}`,
  quantityAvailable,
  quantityReserved: 0,
  variantId,
  version: 1,
})

const simpleCatalog = (variants: readonly { id: string; quantity: number; sku?: string }[]): ProductCatalogReplacePayload => ({
  inventoryRows: variants.map(({ id, quantity }) => stockRow(id, quantity)),
  optionOnVariantRows: [],
  optionRows: [],
  optionValueRows: [],
  variantRows: variants.map(({ id, sku }) => variantRow(id, sku)),
})

describe("replaceProductCatalog on a product that has already sold", () => {
  beforeEach(async () => {
    insertProduct("p1", "one", 0)
    await replaceProductCatalog("p1", simpleCatalog([{ id: "v-sold", quantity: 5, sku: "SOLD" }]))
    sqlite.prepare(`insert into "order" (id, email) values ('order-1', 'buyer@example.com')`).run()
    sqlite
      .prepare(
        `insert into order_item (id, order_id, variant_id, product_id, quantity, unit_price, subtotal, total, title, created_at, updated_at)
         values ('line-1', 'order-1', 'v-sold', 'p1', 1, 2500, 2500, 2500, 'Sold piece', ?, ?)`,
      )
      .run(NOW, NOW)
    sqlite.prepare("update inventory set quantity_available = 3, quantity_reserved = 2 where variant_id = 'v-sold'").run()
  })

  it("keeps the order lines linked to the variant they bought", async () => {
    await replaceProductCatalog("p1", simpleCatalog([{ id: "v-sold", quantity: 3, sku: "SOLD" }]))

    expect(column("select variant_id from order_item", "variant_id")).toStrictEqual(["v-sold"])
    expect(column("select id from product_variant", "id")).toStrictEqual(["v-sold"])
  })

  it("keeps the stock that open checkouts have reserved and its lock version when nothing changed", async () => {
    await replaceProductCatalog("p1", simpleCatalog([{ id: "v-sold", quantity: 3, sku: "SOLD" }]))

    expect(rows("select quantity_available, quantity_reserved, version from inventory")).toStrictEqual([
      { quantity_available: 3, quantity_reserved: 2, version: 1 },
    ])
  })

  it("applies new available stock without touching reservations and moves the lock version", async () => {
    await replaceProductCatalog("p1", simpleCatalog([{ id: "v-sold", quantity: 10, sku: "SOLD" }]))

    expect(rows("select quantity_available, quantity_reserved, version from inventory")).toStrictEqual([
      { quantity_available: 10, quantity_reserved: 2, version: 2 },
    ])
  })
})

describe("replaceProductCatalog variant identity", () => {
  it("lets two variants swap their SKUs in one save", async () => {
    insertProduct("p1", "one", 0)
    await replaceProductCatalog(
      "p1",
      simpleCatalog([
        { id: "v-a", quantity: 1, sku: "SKU-A" },
        { id: "v-b", quantity: 1, sku: "SKU-B" },
      ]),
    )

    await replaceProductCatalog(
      "p1",
      simpleCatalog([
        { id: "v-a", quantity: 1, sku: "SKU-B" },
        { id: "v-b", quantity: 1, sku: "SKU-A" },
      ]),
    )

    expect(rows("select id, sku from product_variant order by id")).toStrictEqual([
      { id: "v-a", sku: "SKU-B" },
      { id: "v-b", sku: "SKU-A" },
    ])
  })

  it("saves a product with thirty variants", async () => {
    insertProduct("p1", "one", 0)
    const variants = Array.from({ length: 30 }, (_, index) => ({ id: `v-${String(index)}`, quantity: index, sku: `SKU-${String(index)}` }))

    await replaceProductCatalog("p1", simpleCatalog(variants))

    expect(column("select count(*) as total from product_variant", "total")).toStrictEqual([30])
    expect(column("select count(*) as total from inventory", "total")).toStrictEqual([30])
  })
})

describe("replaceProductOrganization", () => {
  it("stores the new links and promotes the primary category onto the product", async () => {
    insertProduct("p1", "one", 0)

    await replaceProductOrganization("p1", {
      categoryRows: [
        { categoryId: "cat-1", isPrimary: false, productId: "p1" },
        { categoryId: "cat-2", isPrimary: true, productId: "p1" },
      ],
      collectionRows: [{ collectionId: "col-1", productId: "p1", rank: 0 }],
    })

    expect(column("select category_id from category_on_product order by category_id", "category_id")).toStrictEqual(["cat-1", "cat-2"])
    expect(column("select collection_id from collection_on_product", "collection_id")).toStrictEqual(["col-1"])
    expect(column("select primary_category_id from product", "primary_category_id")).toStrictEqual(["cat-2"])
  })

  it("falls back to the first category when none is marked primary", async () => {
    insertProduct("p1", "one", 0)

    await replaceProductOrganization("p1", {
      categoryRows: [
        { categoryId: "cat-1", productId: "p1" },
        { categoryId: "cat-2", productId: "p1" },
      ],
      collectionRows: [],
    })

    expect(column("select primary_category_id from product", "primary_category_id")).toStrictEqual(["cat-1"])
  })

  it("drops every link and clears the primary category when nothing is selected", async () => {
    insertProduct("p1", "one", 0)
    await replaceProductOrganization("p1", {
      categoryRows: [{ categoryId: "cat-1", isPrimary: true, productId: "p1" }],
      collectionRows: [{ collectionId: "col-1", productId: "p1", rank: 0 }],
    })

    await replaceProductOrganization("p1", { categoryRows: [], collectionRows: [] })

    expect(rows("select category_id from category_on_product")).toStrictEqual([])
    expect(rows("select collection_id from collection_on_product")).toStrictEqual([])
    expect(column("select primary_category_id from product", "primary_category_id")).toStrictEqual([null])
  })
})

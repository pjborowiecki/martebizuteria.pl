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

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import {
  buildAdminProductsFilterParams,
  getAdminProductsCatalogList,
  loadAdminListAggregates,
} from "~/src/modules/product/product.admin-list.server"

const JANUARY = Date.UTC(2026, 0, 10)

const FEBRUARY = Date.UTC(2026, 1, 10)

const titles = (value: string): string => JSON.stringify({ "en-US": value, "pl-PL": value })

const BULK_PRODUCT_IDS = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${index}`)

const isLinkedBulkProduct = (index: number): boolean => index % 10 === 0

const insertBulkCatalog = (): void => {
  const insertProduct = sqlite.prepare(
    "insert into product (id, handle, titles, rank, status, created_at, updated_at) values (?, ?, ?, ?, 'published', ?, ?)",
  )
  const insertVariant = sqlite.prepare("insert into product_variant values (?, ?, ?, ?)")
  const insertStock = sqlite.prepare("insert into inventory values (?, ?)")
  const insertAttributeLink = sqlite.prepare(
    `insert into attribute_on_product (id, attribute_id, product_id, variant_id, value, rank, created_at, updated_at)
     values (?, 'a-material', ?, null, ?, 0, ?, ?)`,
  )
  const insertCategoryLink = sqlite.prepare("insert into category_on_product values (?, 'c-rings', 0)")
  const insertCollectionLink = sqlite.prepare("insert into collection_on_product values (?, 'col-bridal', 0)")
  for (const [index, id] of BULK_PRODUCT_IDS.entries()) {
    insertProduct.run(id, id, titles(id), 10 + index, JANUARY, JANUARY)
    insertVariant.run(`v-${id}`, id, 1000 + index, `SKU-${index}`)
    insertStock.run(`v-${id}`, index)
    if (isLinkedBulkProduct(index)) {
      insertAttributeLink.run(`aop-${id}`, id, `${id} silver`, JANUARY, JANUARY)
      insertCategoryLink.run(id)
      insertCollectionLink.run(id)
    }
  }
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists product;
    drop table if exists product_variant;
    drop table if exists inventory;
    drop table if exists attribute_on_product;
    drop table if exists product_attribute;
    drop table if exists category_on_product;
    drop table if exists product_category;
    drop table if exists collection_on_product;
    drop table if exists product_collection;

    create table product (
      id text primary key, handle text not null, titles text not null, subtitles text, descriptions text, tags text,
      metadata text, primary_category_id text, rank integer not null default 0, status text not null default 'draft',
      thumbnail text, created_at integer not null, updated_at integer not null
    );
    create table product_variant (id text primary key, product_id text, price integer, sku text);
    create table inventory (variant_id text primary key, quantity_available integer);
    create table product_attribute (id text primary key, titles text);
    create table attribute_on_product (
      id text primary key, attribute_id text, product_id text, variant_id text, value text not null,
      rank integer not null default 0, created_at integer not null, updated_at integer not null
    );
    create table product_category (id text primary key, titles text);
    create table category_on_product (product_id text, category_id text, is_primary integer not null default 0);
    create table product_collection (id text primary key, titles text);
    create table collection_on_product (product_id text, collection_id text, rank integer not null default 0);

    insert into product (id, handle, titles, rank, status, created_at, updated_at) values
      ('p-ring', 'pierscionek-luna', '${titles("Luna Ring")}', 1, 'published', ${JANUARY}, ${JANUARY}),
      ('p-cuff', 'bransoleta-aurora', '${titles("Aurora Cuff")}', 0, 'draft', ${FEBRUARY}, ${FEBRUARY}),
      ('p-plain', 'kolczyki-nova', '${titles("Nova Earrings")}', 1, 'published', ${FEBRUARY}, ${FEBRUARY});

    insert into product_variant values
      ('v-ring-s', 'p-ring', 24900, 'RING-S'),
      ('v-ring-m', 'p-ring', 19900, null),
      ('v-cuff', 'p-cuff', 34900, 'CUFF-1');
    insert into inventory values ('v-ring-s', 4), ('v-ring-m', -2), ('v-cuff', 7);

    insert into product_attribute values ('a-material', '${titles("Material")}');
    insert into attribute_on_product (id, attribute_id, product_id, variant_id, value, rank, created_at, updated_at) values
      ('aop-2', 'a-material', 'p-ring', null, 'Gold', 2, ${JANUARY}, ${JANUARY}),
      ('aop-1', 'a-material', 'p-ring', 'v-ring-s', 'Silver', 1, ${JANUARY}, ${JANUARY});

    insert into product_category values ('c-rings', '${titles("Rings")}');
    insert into category_on_product values ('p-ring', 'c-rings', 1);

    insert into product_collection values ('col-bridal', '${titles("Bridal")}');
    insert into collection_on_product values ('p-ring', 'col-bridal', 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("loadAdminListAggregates", () => {
  it("returns empty summaries without querying when no product is listed", async () => {
    const aggregates = await loadAdminListAggregates([])

    expect(aggregates.skuSummaryByProductId.size).toBe(0)
    expect(aggregates.statsByProductId.size).toBe(0)
  })

  it("summarises the variant price, stock and count of each listed product", async () => {
    const { statsByProductId } = await loadAdminListAggregates([{ id: "p-ring" }, { id: "p-cuff" }])

    expect(statsByProductId.get("p-ring")).toStrictEqual({ minPrice: 19_900, totalStock: 2, variantCount: 2 })
    expect(statsByProductId.get("p-cuff")).toStrictEqual({ minPrice: 34_900, totalStock: 7, variantCount: 1 })
  })

  it("joins the SKUs of each listed product, leaving the variants without one out", async () => {
    const { skuSummaryByProductId } = await loadAdminListAggregates([{ id: "p-ring" }, { id: "p-cuff" }])

    expect(skuSummaryByProductId.get("p-ring")).toBe("RING-S")
    expect(skuSummaryByProductId.get("p-cuff")).toBe("CUFF-1")
  })

  it("leaves out a product no variant belongs to", async () => {
    const aggregates = await loadAdminListAggregates([{ id: "p-plain" }])

    expect(aggregates.statsByProductId.get("p-plain")).toBeUndefined()
    expect(aggregates.skuSummaryByProductId.get("p-plain")).toBeUndefined()
  })
})

describe("buildAdminProductsFilterParams", () => {
  it("carries every catalog facet through untouched", () => {
    const params = buildAdminProductsFilterParams({
      categoryId: "c-rings",
      collectionId: "col-bridal",
      inventoryLevel: "low",
      minPrice: { amountMinorUnits: 100, operator: "gte" },
      sort: { columnId: "minPrice", desc: false },
      status: "published",
      variantKind: "multi",
    })

    expect(params).toStrictEqual({
      categoryId: "c-rings",
      collectionId: "col-bridal",
      createdAt: undefined,
      inventoryLevel: "low",
      minPrice: { amountMinorUnits: 100, operator: "gte" },
      search: undefined,
      sort: { columnId: "minPrice", desc: false },
      status: "published",
      totalStock: undefined,
      variantKind: "multi",
    })
  })

  it("trims the search term the admin typed", () => {
    expect(buildAdminProductsFilterParams({ search: "  Luna Ring " }).search).toBe("Luna Ring")
  })

  it("drops a search term that holds no characters", () => {
    expect(buildAdminProductsFilterParams({ search: "   " }).search).toBeUndefined()
  })
})

describe("getAdminProductsCatalogList", () => {
  it("orders the catalog by rank and then by newest first", async () => {
    const rows = await getAdminProductsCatalogList()

    expect(rows.map((row) => row.id)).toStrictEqual(["p-cuff", "p-plain", "p-ring"])
  })

  it("returns an empty catalog when no product exists", async () => {
    sqlite.exec("delete from product")

    await expect(getAdminProductsCatalogList()).resolves.toStrictEqual([])
  })

  it("attaches the attributes of a product in rank order together with the attribute titles", async () => {
    const rows = await getAdminProductsCatalogList()
    const ring = rows.find((row) => row.id === "p-ring")

    expect(ring?.attributes.map((row) => row.id)).toStrictEqual(["aop-1", "aop-2"])
    expect(ring?.attributes[0]?.value).toBe("Silver")
    expect(ring?.attributes[0]?.productAttribute.titles).toStrictEqual({ "en-US": "Material", "pl-PL": "Material" })
  })

  it("attaches the categories and collections of a product", async () => {
    const rows = await getAdminProductsCatalogList()
    const ring = rows.find((row) => row.id === "p-ring")

    expect(ring?.categories).toStrictEqual([
      { categoryId: "c-rings", isPrimary: true, productCategory: { titles: { "en-US": "Rings", "pl-PL": "Rings" } }, productId: "p-ring" },
    ])
    expect(ring?.collections).toStrictEqual([
      {
        collectionId: "col-bridal",
        productCollection: { titles: { "en-US": "Bridal", "pl-PL": "Bridal" } },
        productId: "p-ring",
        rank: 0,
      },
    ])
  })

  it("leaves a product with no relations with empty lists", async () => {
    const rows = await getAdminProductsCatalogList()
    const plain = rows.find((row) => row.id === "p-plain")

    expect(plain?.attributes).toStrictEqual([])
    expect(plain?.categories).toStrictEqual([])
    expect(plain?.collections).toStrictEqual([])
  })

  it("keeps the stored product row alongside the relations", async () => {
    const rows = await getAdminProductsCatalogList()
    const cuff = rows.find((row) => row.id === "p-cuff")

    expect(cuff?.handle).toBe("bransoleta-aurora")
    expect(cuff?.status).toBe("draft")
    expect(cuff?.titles).toStrictEqual({ "en-US": "Aurora Cuff", "pl-PL": "Aurora Cuff" })
    expect(cuff?.createdAt).toStrictEqual(new Date(FEBRUARY))
  })
})

describe("loadAdminListAggregates for the largest admin page", () => {
  it("summarises the variant price, stock, count and SKU of every listed product", async () => {
    insertBulkCatalog()

    const { skuSummaryByProductId, statsByProductId } = await loadAdminListAggregates(BULK_PRODUCT_IDS.map((id) => ({ id })))

    expect(Object.fromEntries(statsByProductId)).toStrictEqual(
      Object.fromEntries(BULK_PRODUCT_IDS.map((id, index) => [id, { minPrice: 1000 + index, totalStock: index, variantCount: 1 }])),
    )
    expect(Object.fromEntries(skuSummaryByProductId)).toStrictEqual(
      Object.fromEntries(BULK_PRODUCT_IDS.map((id, index) => [id, `SKU-${index}`])),
    )
  })
})

describe("getAdminProductsCatalogList for a catalog larger than the largest admin page", () => {
  beforeEach(insertBulkCatalog)

  it("lists every product by rank", async () => {
    const rows = await getAdminProductsCatalogList()

    expect(rows.map((row) => row.id)).toStrictEqual(["p-cuff", "p-plain", "p-ring", ...BULK_PRODUCT_IDS])
  })

  it("attaches to every product only its own attributes, categories and collections", async () => {
    const rows = await getAdminProductsCatalogList()

    expect(
      rows.slice(3).map((row) => ({
        attributes: row.attributes.map((link) => link.value),
        categories: row.categories.map((link) => [link.productId, link.categoryId]),
        collections: row.collections.map((link) => [link.productId, link.collectionId]),
        id: row.id,
      })),
    ).toStrictEqual(
      BULK_PRODUCT_IDS.map((id, index) =>
        isLinkedBulkProduct(index)
          ? { attributes: [`${id} silver`], categories: [[id, "c-rings"]], collections: [[id, "col-bridal"]], id }
          : { attributes: [], categories: [], collections: [], id },
      ),
    )
  })
})

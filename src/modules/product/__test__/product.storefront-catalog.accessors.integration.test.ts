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

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { STOREFRONT_PRODUCTS_SORT } from "~/src/modules/product/product.storefront-catalog"
import {
  type StorefrontPublishedProductsParams,
  getStorefrontPublishedProductsPage,
} from "~/src/modules/product/product.storefront-catalog.accessors"

const JANUARY = Date.UTC(2024, 0, 1)

const JUNE = Date.UTC(2024, 5, 1)

const DECEMBER = Date.UTC(2024, 11, 1)

const PAGE = { limit: 25, offset: 0 }

const DESCENDANT_CATEGORY_COUNT = 150

const titles = (value: string) => JSON.stringify({ "en-US": value, "pl-PL": value })

const pageIds = async (params: Partial<StorefrontPublishedProductsParams> = {}): Promise<string[]> => {
  const result = await getStorefrontPublishedProductsPage({ ...PAGE, ...params })

  return result.items.map((item) => item.id)
}

beforeEach(() => {
  database.dropsCountRows = false
  sqlite.exec(`
    drop table if exists product;
    drop table if exists product_variant;
    drop table if exists inventory;
    drop table if exists category_on_product;
    drop table if exists collection_on_product;
    drop table if exists product_category;
    drop table if exists product_collection;
    drop table if exists storefront_search;

    create table product (
      descriptions text, handle text not null, id text primary key, metadata text,
      primary_category_id text, rank integer not null default 0,
      status text not null default 'draft', subtitles text, tags text, thumbnail text,
      titles text not null, created_at integer not null, updated_at integer not null
    );
    create table product_variant (
      barcode text, compare_at_price integer, id text primary key,
      manage_inventory integer not null default 1, metadata text,
      price integer not null default 0, product_id text not null, sku text,
      title text not null, created_at integer not null, updated_at integer not null
    );
    create table inventory (variant_id text primary key, quantity_available integer not null default 0);
    create table category_on_product (category_id text, product_id text);
    create table collection_on_product (collection_id text, product_id text);
    create table product_category (
      descriptions text, handle text not null, id text primary key, image text, metadata text, parent_id text,
      rank integer not null default 0, short_descriptions text, status text not null default 'draft', subtitles text,
      titles text not null, created_at integer not null default 0, updated_at integer not null default 0
    );
    create table product_collection (
      descriptions text, handle text not null, id text primary key, image text, metadata text, rank integer not null default 0,
      short_descriptions text, status text not null default 'draft', titles text not null,
      created_at integer not null default 0, updated_at integer not null default 0
    );
  `)
  applyMigration(sqlite, MIGRATION.STOREFRONT_SEARCH)
  sqlite.exec(`
    insert into product (handle, id, rank, status, subtitles, titles, created_at, updated_at) values
      ('cheap-ring', 'cheap', 1, 'published', null, '${titles("Cheap Ring")}', ${JANUARY}, ${JANUARY}),
      ('mid-necklace', 'mid', 2, 'published', '${titles("Silver chain")}', '${titles("Mid Necklace")}', ${JUNE}, ${JUNE}),
      ('pricey-tiara', 'pricey', 2, 'published', null, '${titles("Pricey Tiara")}', ${DECEMBER}, ${DECEMBER}),
      ('draft-brooch', 'draft', 0, 'draft', null, '${titles("Draft Brooch")}', ${JANUARY}, ${JANUARY}),
      ('sold-out-pin', 'soldout', 0, 'published', null, '${titles("Sold Out Pin")}', ${JANUARY}, ${JANUARY});

    insert into product_variant (id, price, product_id, sku, title, created_at, updated_at) values
      ('v-cheap', 10000, 'cheap', 'SKU-CHEAP', 'One size', ${JANUARY}, ${JANUARY}),
      ('v-mid-a', 30000, 'mid', 'SKU-MID-A', 'Short', ${JUNE}, ${JUNE}),
      ('v-mid-b', 50000, 'mid', 'SKU-MID-B', 'Long', ${JUNE}, ${JUNE}),
      ('v-pricey', 90000, 'pricey', 'SKU-PRICEY', 'One size', ${DECEMBER}, ${DECEMBER}),
      ('v-draft', 20000, 'draft', 'SKU-DRAFT', 'One size', ${JANUARY}, ${JANUARY}),
      ('v-soldout', 20000, 'soldout', 'SKU-SOLDOUT', 'One size', ${JANUARY}, ${JANUARY});

    insert into inventory (variant_id, quantity_available) values
      ('v-cheap', 4), ('v-mid-a', 1), ('v-mid-b', 2), ('v-pricey', 3), ('v-draft', 9), ('v-soldout', 0);

    insert into category_on_product (category_id, product_id) values
      ('rings', 'cheap'), ('crowns', 'pricey'), ('rings', 'draft');

    insert into collection_on_product (collection_id, product_id) values
      ('bridal', 'mid'), ('bridal', 'pricey');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("storefront published products page", () => {
  it("lists only published products that still have stock", async () => {
    await expect(pageIds()).resolves.toStrictEqual(["cheap", "pricey", "mid"])
  })

  it("orders by rank first and falls back to the newest product", async () => {
    await expect(pageIds({ sort: STOREFRONT_PRODUCTS_SORT.RANK })).resolves.toStrictEqual(["cheap", "pricey", "mid"])
  })

  it("returns the storefront variant columns and nothing else", async () => {
    const result = await getStorefrontPublishedProductsPage({ ...PAGE, categoryIds: ["rings"] })

    expect(result.items[0]?.variants).toStrictEqual([{ id: "v-cheap", price: 10_000, productId: "cheap", title: "One size" }])
  })

  it("reports the unpaginated total alongside the requested slice", async () => {
    const result = await getStorefrontPublishedProductsPage({ limit: 2, offset: 0 })

    expect(result.items.map((item) => item.id)).toStrictEqual(["cheap", "pricey"])
    expect(result.total).toBe(3)
  })

  it("keeps the ordering across pages", async () => {
    const result = await getStorefrontPublishedProductsPage({ limit: 2, offset: 2 })

    expect(result.items.map((item) => item.id)).toStrictEqual(["mid"])
    expect(result.total).toBe(3)
  })

  it("returns an empty page with the real total when the offset is past the end", async () => {
    await expect(getStorefrontPublishedProductsPage({ limit: 2, offset: 10 })).resolves.toStrictEqual({ items: [], total: 3 })
  })
})

describe("storefront catalog scoping", () => {
  it("restricts the page to the requested categories", async () => {
    await expect(pageIds({ categoryIds: ["rings", "crowns"] })).resolves.toStrictEqual(["cheap", "pricey"])
  })

  it("restricts the page to a category tree with more descendants than D1 binds per statement", async () => {
    const descendantIds = Array.from({ length: DESCENDANT_CATEGORY_COUNT }, (_, index) => `rings-${String(index)}`)
    sqlite
      .prepare("insert into category_on_product (category_id, product_id) values (?, 'mid')")
      .run(`rings-${String(DESCENDANT_CATEGORY_COUNT - 1)}`)

    await expect(pageIds({ categoryIds: ["rings", ...descendantIds] })).resolves.toStrictEqual(["cheap", "mid"])
  })

  it("ignores an empty category selection instead of returning nothing", async () => {
    await expect(pageIds({ categoryIds: [] })).resolves.toStrictEqual(["cheap", "pricey", "mid"])
  })

  it("restricts the page to a single collection", async () => {
    await expect(pageIds({ collectionId: "bridal" })).resolves.toStrictEqual(["pricey", "mid"])
  })

  it("combines a category and a collection as an intersection", async () => {
    await expect(pageIds({ categoryIds: ["rings"], collectionId: "bridal" })).resolves.toStrictEqual([])
  })

  it("reports a zero total when the scope matches no product", async () => {
    await expect(getStorefrontPublishedProductsPage({ ...PAGE, collectionId: "nonexistent" })).resolves.toStrictEqual({
      items: [],
      total: 0,
    })
  })
})

describe("storefront catalog price filters", () => {
  it("keeps products whose cheapest variant is at or above the minimum", async () => {
    await expect(pageIds({ minPriceCents: 30_000 })).resolves.toStrictEqual(["pricey", "mid"])
  })

  it("keeps products whose cheapest variant is at or below the maximum", async () => {
    await expect(pageIds({ maxPriceCents: 30_000 })).resolves.toStrictEqual(["cheap", "mid"])
  })

  it("applies both bounds together", async () => {
    await expect(pageIds({ maxPriceCents: 60_000, minPriceCents: 20_000 })).resolves.toStrictEqual(["mid"])
  })

  it("counts each product once while joining the variant statistics", async () => {
    const result = await getStorefrontPublishedProductsPage({ ...PAGE, minPriceCents: 0 })

    expect(result.total).toBe(3)
    expect(result.items).toHaveLength(3)
  })
})

describe("storefront catalog sorting", () => {
  it("sorts by the cheapest variant ascending", async () => {
    await expect(pageIds({ sort: STOREFRONT_PRODUCTS_SORT.PRICE_ASC })).resolves.toStrictEqual(["cheap", "mid", "pricey"])
  })

  it("sorts by the cheapest variant descending", async () => {
    await expect(pageIds({ sort: STOREFRONT_PRODUCTS_SORT.PRICE_DESC })).resolves.toStrictEqual(["pricey", "mid", "cheap"])
  })

  it("sorts by creation date for the newest sort", async () => {
    await expect(pageIds({ sort: STOREFRONT_PRODUCTS_SORT.NEWEST })).resolves.toStrictEqual(["pricey", "mid", "cheap"])
  })
})

describe("storefront catalog search", () => {
  it("matches a handle fragment case insensitively", async () => {
    await expect(pageIds({ searchTerm: "NECKLACE" })).resolves.toStrictEqual(["mid"])
  })

  it("matches localized titles", async () => {
    await expect(pageIds({ searchTerm: "Pricey Tiara" })).resolves.toStrictEqual(["pricey"])
  })

  it("matches a localized subtitle", async () => {
    await expect(pageIds({ searchTerm: "silver chain" })).resolves.toStrictEqual(["mid"])
  })

  it("matches a variant SKU", async () => {
    await expect(pageIds({ searchTerm: "SKU-MID-B" })).resolves.toStrictEqual(["mid"])
  })

  it("never surfaces an unpublished product through search", async () => {
    await expect(pageIds({ searchTerm: "SKU-DRAFT" })).resolves.toStrictEqual([])
  })

  it("treats a blank search term as no search at all", async () => {
    await expect(pageIds({ searchTerm: "   " })).resolves.toStrictEqual(["cheap", "pricey", "mid"])
  })

  it("does not treat wildcard characters in the term as patterns", async () => {
    await expect(pageIds({ searchTerm: "%" })).resolves.toStrictEqual([])
  })

  it("combines a search term with a price bound", async () => {
    await expect(pageIds({ minPriceCents: 40_000, searchTerm: "SKU-MID-A" })).resolves.toStrictEqual([])
  })
})

describe("storefront catalog search ordering", () => {
  beforeEach(() => {
    sqlite.exec(`
      insert into product (handle, id, rank, status, subtitles, titles, created_at, updated_at) values
        ('silver-cuff', 'cuff', 5, 'published', null, '${titles("Silver Cuff")}', ${JANUARY}, ${JANUARY});
      insert into product_variant (id, price, product_id, sku, title, created_at, updated_at) values
        ('v-cuff', 15000, 'cuff', 'SKU-CUFF', 'One size', ${JANUARY}, ${JANUARY});
      insert into inventory (variant_id, quantity_available) values ('v-cuff', 2);
    `)
  })

  it("puts the closest match first under the default sort, ahead of the merchandising rank", async () => {
    await expect(pageIds({ searchTerm: "silver" })).resolves.toStrictEqual(["cuff", "mid"])
  })

  it("keeps relevance first when the shopper picks the rank sort explicitly", async () => {
    await expect(pageIds({ searchTerm: "silver", sort: STOREFRONT_PRODUCTS_SORT.RANK })).resolves.toStrictEqual(["cuff", "mid"])
  })

  it("lets an explicit newest sort override relevance", async () => {
    await expect(pageIds({ searchTerm: "silver", sort: STOREFRONT_PRODUCTS_SORT.NEWEST })).resolves.toStrictEqual(["mid", "cuff"])
  })

  it.each([
    ["closest first", {}, { ids: ["cuff", "mid"], total: 2 }],
    ["one per page", { limit: 1 }, { ids: ["cuff"], total: 2 }],
    ["by the cheapest variant descending", { sort: STOREFRONT_PRODUCTS_SORT.PRICE_DESC }, { ids: ["mid", "cuff"], total: 2 }],
    ["at or above a minimum price, closest first", { minPriceCents: 20_000 }, { ids: ["mid"], total: 1 }],
    [
      "at or below a maximum price, cheapest first",
      { maxPriceCents: 20_000, sort: STOREFRONT_PRODUCTS_SORT.PRICE_ASC },
      { ids: ["cuff"], total: 1 },
    ],
  ])("lists the matches %s and reports their total", async (_label, params, expected) => {
    const result = await getStorefrontPublishedProductsPage({ ...PAGE, searchTerm: "silver", ...params })

    expect({ ids: result.items.map((item) => item.id), total: result.total }).toStrictEqual(expected)
  })
})

describe("storefront catalog without a count row", () => {
  beforeEach(() => {
    database.dropsCountRows = true
  })

  it("still lists the page and reports a zero total", async () => {
    await expect(getStorefrontPublishedProductsPage({ limit: 2, offset: 0 })).resolves.toMatchObject({
      items: [{ id: "cheap" }, { id: "pricey" }],
      total: 0,
    })
  })

  it("reports a zero total for an empty page too", async () => {
    await expect(getStorefrontPublishedProductsPage({ limit: 2, offset: 10 })).resolves.toStrictEqual({ items: [], total: 0 })
  })
})

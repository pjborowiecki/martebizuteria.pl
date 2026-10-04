import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { storefrontProductMatches, storefrontSearchMatches } from "~/src/modules/storefront-search/storefront-search.accessors.server"
import {
  searchStorefrontCategories,
  searchStorefrontCollections,
  searchStorefrontProducts,
} from "~/src/modules/storefront-search/storefront-search.server"
import { buildStorefrontSearchExpression } from "~/src/modules/storefront-search/storefront-search.utils"

const LIMIT = 6

const localized = (pl: string, en: string) => JSON.stringify({ "en-US": en, "pl-PL": pl })

const productNames = async (term: string, locale = "pl-PL") => {
  const items = await searchStorefrontProducts(term, locale, LIMIT)

  return items.map((item) => item.name)
}

const productMatches = async (term: string) => {
  const matches = storefrontProductMatches(term)!
  const rows = await db.with(matches).select({ id: matches.productId, score: matches.score }).from(matches)

  return rows.toSorted((left, right) => left.id.localeCompare(right.id))
}

const productTextRelevance = async (term: string) => {
  const matches = storefrontSearchMatches("product", buildStorefrontSearchExpression(term)!)
  const rows = await db.select({ id: matches.entityId, score: matches.score }).from(matches)

  return rows.toSorted((left, right) => left.id.localeCompare(right.id))
}

const matchingProductIds = async (term: string) => {
  const rows = await productMatches(term)

  return rows.map((row) => row.id)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists storefront_search;
    drop table if exists product;
    drop table if exists product_variant;
    drop table if exists inventory;
    drop table if exists product_category;
    drop table if exists product_collection;
    drop table if exists category_on_product;
    drop table if exists collection_on_product;

    create table product (
      id text primary key, handle text not null, titles text not null, subtitles text, descriptions text, tags text,
      thumbnail text, metadata text, primary_category_id text, rank integer not null default 0,
      status text not null default 'draft', created_at integer not null default 0, updated_at integer not null default 0
    );
    create table product_variant (
      id text primary key, product_id text not null, sku text, title text not null default '', price integer not null default 0,
      compare_at_price integer, barcode text, manage_inventory integer not null default 1, metadata text,
      created_at integer not null default 0, updated_at integer not null default 0
    );
    create table inventory (
      id text primary key, variant_id text, quantity_available integer, quantity_reserved integer, version integer,
      created_at integer, updated_at integer
    );
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
    create table category_on_product (category_id text not null, product_id text not null, created_at integer not null default 0, updated_at integer not null default 0);
    create table collection_on_product (collection_id text not null, product_id text not null, created_at integer not null default 0, updated_at integer not null default 0);
  `)
  applyMigration(sqlite, MIGRATION.STOREFRONT_SEARCH)

  sqlite.exec(`
    insert into product_category (id, handle, titles, status, rank) values
      ('cat-rings', 'pierscionki', '${localized("Pierścionki", "Rings")}', 'active', 1),
      ('cat-hidden', 'ukryte', '${localized("Pierścionki ukryte", "Hidden rings")}', 'draft', 2);
    insert into product_collection (id, handle, titles, status, rank) values
      ('col-gold', 'zloto-585', '${localized("Złoto 585", "Gold 585")}', 'active', 1),
      ('col-archive', 'archiwum', '${localized("Złote archiwum", "Golden archive")}', 'draft', 2);

    insert into product (id, handle, titles, subtitles, descriptions, tags, thumbnail, primary_category_id, rank, status) values
      ('p-aurora', 'aurora-ring', '${localized("Pierścionek Aurora", "Aurora Ring")}', '${localized("Srebro 925", "Sterling silver")}', null, null, 'products/aurora.webp', 'cat-rings', 2, 'published'),
      ('p-gold', 'gold-ring', '${localized("Złoty pierścionek", "Gold ring")}', null, null, '${JSON.stringify({ "en-US": ["gift"], "pl-PL": ["prezent"] })}', null, 'cat-rings', 3, 'published'),
      ('p-luna', 'luna-chain', '${localized("Łańcuszek Luna", "Luna Chain")}', null, '${localized("Delikatny łańcuszek ze złota", "A delicate gold chain")}', null, null, null, 1, 'published'),
      ('p-draft', 'draft-ring', '${localized("Pierścionek szkic", "Draft ring")}', null, null, null, null, null, 4, 'draft'),
      ('p-sold', 'sold-ring', '${localized("Pierścionek wyprzedany", "Sold out ring")}', null, null, null, null, null, 5, 'published');

    insert into category_on_product (category_id, product_id) values ('cat-rings', 'p-aurora'), ('cat-rings', 'p-gold'), ('cat-hidden', 'p-luna');
    insert into collection_on_product (collection_id, product_id) values ('col-gold', 'p-luna'), ('col-archive', 'p-aurora');
    insert into product_variant (id, product_id, sku) values
      ('v-aurora', 'p-aurora', 'AUR-001'), ('v-gold', 'p-gold', 'GLD-001'), ('v-luna', 'p-luna', 'LUN-001'),
      ('v-draft', 'p-draft', 'DRF-001'), ('v-sold', 'p-sold', 'SLD-001');
    insert into inventory (id, variant_id, quantity_available) values
      ('i-aurora', 'v-aurora', 5), ('i-gold', 'v-gold', 5), ('i-luna', 'v-luna', 5), ('i-draft', 'v-draft', 5), ('i-sold', 'v-sold', 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("searchStorefrontProducts", () => {
  it("finds a Polish title typed without diacritics", async () => {
    const names = await productNames("pierscionek")

    expect(names.toSorted()).toStrictEqual(["Pierścionek Aurora", "Złoty pierścionek"])
  })

  it("folds the stroked l so łańcuszek is found as lancuszek", async () => {
    await expect(productNames("lancuszek")).resolves.toStrictEqual(["Łańcuszek Luna"])
  })

  it("matches each word as a prefix while the customer is still typing", async () => {
    await expect(productNames("zlo pier")).resolves.toStrictEqual(["Złoty pierścionek"])
  })

  it("ranks a title match above a description match", async () => {
    await expect(productNames("zlot")).resolves.toStrictEqual(["Złoty pierścionek", "Łańcuszek Luna"])
  })

  it("finds a product by a tag", async () => {
    await expect(productNames("prezent")).resolves.toStrictEqual(["Złoty pierścionek"])
  })

  it("does not match the locale keys or syntax of the stored JSON", async () => {
    await expect(productNames("pl")).resolves.toStrictEqual([])
    await expect(productNames("en")).resolves.toStrictEqual([])
  })

  it("leaves drafts and sold-out products out", async () => {
    const names = await productNames("pierscionek")

    expect(names).not.toContain("Pierścionek szkic")
    expect(names).not.toContain("Pierścionek wyprzedany")
  })

  it("has nothing to search for in pure punctuation", async () => {
    await expect(productNames("!!!")).resolves.toStrictEqual([])
  })

  it("honours the limit", async () => {
    await expect(searchStorefrontProducts("pierscionek", "pl-PL", 1)).resolves.toHaveLength(1)
  })

  it("names and details each hit in the requested locale", async () => {
    const [aurora] = await searchStorefrontProducts("aurora", "en-US", LIMIT)

    expect(aurora).toMatchObject({ detail: "Sterling silver", handle: "aurora-ring", name: "Aurora Ring", type: "product" })
    expect(aurora?.image).toContain("products/aurora.webp")
  })

  it("falls back to the primary category as the detail, or to nothing", async () => {
    const [gold] = await searchStorefrontProducts("gold ring", "en-US", LIMIT)
    const [luna] = await searchStorefrontProducts("luna", "en-US", LIMIT)

    expect(gold?.detail).toBe("Rings")
    expect(luna?.detail).toBeUndefined()
  })

  it("follows a retitled product and forgets a deleted one", async () => {
    sqlite.exec(`update product set titles = '${localized("Bransoletka Aurora", "Aurora Bracelet")}' where id = 'p-aurora'`)
    sqlite.exec("delete from product where id = 'p-luna'")

    await expect(productNames("pierscionek")).resolves.toStrictEqual(["Złoty pierścionek"])
    await expect(productNames("bransoletka")).resolves.toStrictEqual(["Bransoletka Aurora"])
    await expect(productNames("lancuszek")).resolves.toStrictEqual([])
  })
})

describe("storefront search index", () => {
  it("indexes the rows that already exist when the migration lands", async () => {
    sqlite.exec(`
      drop trigger storefront_search_product_insert; drop trigger storefront_search_product_update; drop trigger storefront_search_product_delete;
      drop trigger storefront_search_product_category_insert; drop trigger storefront_search_product_category_update; drop trigger storefront_search_product_category_delete;
      drop trigger storefront_search_product_collection_insert; drop trigger storefront_search_product_collection_update; drop trigger storefront_search_product_collection_delete;
      drop table storefront_search;
    `)
    applyMigration(sqlite, MIGRATION.STOREFRONT_SEARCH)

    await expect(productNames("lancuszek")).resolves.toStrictEqual(["Łańcuszek Luna"])
    await expect(searchStorefrontCategories("pierscionki", "pl-PL", LIMIT)).resolves.toHaveLength(1)
    await expect(searchStorefrontCollections("zloto", "pl-PL", LIMIT)).resolves.toHaveLength(1)
  })

  it("does not duplicate rows when the migration is applied twice", async () => {
    applyMigration(sqlite, MIGRATION.STOREFRONT_SEARCH)

    await expect(productNames("lancuszek")).resolves.toStrictEqual(["Łańcuszek Luna"])
  })
})

describe("storefrontProductMatches", () => {
  it("collects the products whose text the index matches", async () => {
    await expect(matchingProductIds("zlot")).resolves.toStrictEqual(["p-gold", "p-luna"])
  })

  it("includes the products of an active category the term names, even in its plural", async () => {
    await expect(matchingProductIds("pierscionki")).resolves.toStrictEqual(["p-aurora", "p-gold"])
  })

  it("includes the products of an active collection the term names", async () => {
    await expect(matchingProductIds("585")).resolves.toStrictEqual(["p-luna"])
  })

  it("finds a product by its exact SKU, whatever the case", async () => {
    await expect(matchingProductIds("gld-001")).resolves.toStrictEqual(["p-gold"])
    await expect(matchingProductIds("gld")).resolves.toStrictEqual([])
  })

  it("does not reach products through a draft category or collection", async () => {
    await expect(matchingProductIds("ukryte")).resolves.toStrictEqual([])
    await expect(matchingProductIds("archiwum")).resolves.toStrictEqual([])
  })

  it("has nothing to collect for a term with no words in it", () => {
    expect(storefrontProductMatches("!!!")).toBeUndefined()
  })

  it("lists a product reached by its text and by its category once, with the relevance of its text", async () => {
    const rows = await productMatches("pierscion")

    expect(rows.map((row) => row.id)).toStrictEqual(["p-aurora", "p-draft", "p-gold", "p-sold"])
    await expect(searchStorefrontCategories("pierscion", "pl-PL", LIMIT)).resolves.toMatchObject([{ handle: "pierscionki" }])
    await expect(productTextRelevance("pierscion")).resolves.toStrictEqual(rows)
  })

  it.each([
    ["a category", "pierscionki", ["p-aurora", "p-gold"]],
    ["a collection", "585", ["p-luna"]],
    ["a SKU", "gld-001", ["p-gold"]],
  ])("leaves the relevance empty for a product reached only through %s", async (_label, term, ids) => {
    await expect(productMatches(term)).resolves.toStrictEqual(ids.map((id) => ({ id, score: null })))
  })
})

describe("searchStorefrontCategories", () => {
  it("finds an active category typed without diacritics, in the requested locale", async () => {
    const results = await searchStorefrontCategories("pierscionki", "en-US", LIMIT)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ handle: "pierscionki", name: "Rings", type: "category" })
  })

  it("leaves a draft category out", async () => {
    await expect(searchStorefrontCategories("ukryte", "pl-PL", LIMIT)).resolves.toStrictEqual([])
  })

  it("has nothing to search for in pure punctuation", async () => {
    await expect(searchStorefrontCategories("!!!", "pl-PL", LIMIT)).resolves.toStrictEqual([])
  })
})

describe("searchStorefrontCollections", () => {
  it("finds an active collection by its folded title", async () => {
    const results = await searchStorefrontCollections("zloto", "pl-PL", LIMIT)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ handle: "zloto-585", name: "Złoto 585", type: "collection" })
  })

  it("leaves a draft collection out", async () => {
    await expect(searchStorefrontCollections("archiwum", "pl-PL", LIMIT)).resolves.toStrictEqual([])
  })

  it("has nothing to search for in pure punctuation", async () => {
    await expect(searchStorefrontCollections("...", "pl-PL", LIMIT)).resolves.toStrictEqual([])
  })
})

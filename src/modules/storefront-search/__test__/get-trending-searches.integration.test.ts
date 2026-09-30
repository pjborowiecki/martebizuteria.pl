import type * as ReactStart from "@tanstack/react-start"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactStart>()

  return {
    ...actual,
    createServerFn: () => {
      const state: { validate: ((input: unknown) => unknown) | undefined } = { validate: undefined }
      const builder = {
        handler: (handler: (options: { data: unknown }) => unknown) => async (options: { data: unknown }) => {
          await Promise.resolve()

          return handler({ data: state.validate === undefined ? options.data : state.validate(options.data) })
        },
        middleware: () => builder,
        validator: (validate: (input: unknown) => unknown) => {
          state.validate = validate

          return builder
        },
      }

      return builder
    },
  }
})
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { STOREFRONT_SEARCH_QUERY_KEYS } from "~/src/modules/storefront-search/storefront-search.constants"
import { getTrendingSearches, getTrendingSearchesQuery } from "~/src/modules/storefront-search/use-cases/get-trending-searches"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

const JANUARY = Date.UTC(2024, 0, 1)

const JUNE = Date.UTC(2024, 5, 1)

const titles = (pl: string, en: string) => JSON.stringify({ "en-US": en, "pl-PL": pl })

const trendingLabels = async (locale?: string): Promise<string[]> => {
  const items = await getTrendingSearches({ data: locale === undefined ? {} : { locale } })

  return items.map((item) => item.label)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists product_category;
    drop table if exists product_collection;

    create table product_category (
      descriptions text, handle text not null, id text primary key, image text, metadata text,
      parent_id text, rank integer not null default 0, short_descriptions text,
      status text not null default 'draft', subtitles text, titles text not null,
      created_at integer not null, updated_at integer not null
    );
    create table product_collection (
      descriptions text, handle text not null, id text primary key, image text, metadata text,
      rank integer not null default 0, status text not null default 'draft', titles text not null,
      created_at integer not null, updated_at integer not null
    );

    insert into product_category (handle, id, image, rank, status, titles, created_at, updated_at) values
      ('pierscionki', 'cat-rings', 'categories/rings.jpg', 1, 'active', '${titles("Pierścionki", "Rings")}', ${JANUARY}, ${JANUARY}),
      ('naszyjniki', 'cat-necklaces', null, 2, 'active', '${titles("Naszyjniki", "Necklaces")}', ${JUNE}, ${JUNE}),
      ('bransoletki', 'cat-bracelets', null, 2, 'active', '${titles("Bransoletki", "Bracelets")}', ${JANUARY}, ${JANUARY}),
      ('kolczyki', 'cat-earrings', null, 3, 'active', '${titles("Kolczyki", "Earrings")}', ${JANUARY}, ${JANUARY}),
      ('ukryte', 'cat-hidden', null, 0, 'draft', '${titles("Ukryte", "Hidden")}', ${JANUARY}, ${JANUARY});

    insert into product_collection (handle, id, image, rank, status, titles, created_at, updated_at) values
      ('slubna', 'col-bridal', 'collections/bridal.jpg', 1, 'active', '${titles("Kolekcja Ślubna", "Bridal")}', ${JANUARY}, ${JANUARY}),
      ('letnia', 'col-summer', null, 2, 'active', '${titles("Kolekcja Letnia", "Summer")}', ${JANUARY}, ${JANUARY}),
      ('zimowa', 'col-winter', null, 3, 'active', '${titles("Kolekcja Zimowa", "Winter")}', ${JANUARY}, ${JANUARY}),
      ('archiwum', 'col-archive', null, 0, 'draft', '${titles("Archiwum", "Archive")}', ${JANUARY}, ${JANUARY});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getTrendingSearches", () => {
  it("caps the suggestions at the trending limit, categories before collections", async () => {
    await expect(trendingLabels("en-US")).resolves.toStrictEqual(["Rings", "Necklaces", "Bracelets", "Bridal", "Summer"])
  })

  it("labels each suggestion with the source it came from", async () => {
    const items = await getTrendingSearches({ data: { locale: "en-US" } })

    expect(items.map((item) => item.type)).toStrictEqual(["category", "category", "category", "collection", "collection"])
  })

  it("takes only the first rows of each source, ordered by rank then newest", async () => {
    const items = await getTrendingSearches({ data: { locale: "en-US" } })

    expect(items.map((item) => item.handle)).toStrictEqual(["pierscionki", "naszyjniki", "bransoletki", "slubna", "letnia"])
  })

  it("never suggests a draft category or collection", async () => {
    await expect(trendingLabels("en-US")).resolves.not.toContain("Hidden")
    await expect(trendingLabels("en-US")).resolves.not.toContain("Archive")
  })

  it("resolves the labels in the requested locale", async () => {
    await expect(trendingLabels("pl-PL")).resolves.toStrictEqual([
      "Pierścionki",
      "Naszyjniki",
      "Bransoletki",
      "Kolekcja Ślubna",
      "Kolekcja Letnia",
    ])
  })

  it("falls back to the default locale for an unsupported one", async () => {
    await expect(trendingLabels("de-DE")).resolves.toStrictEqual([
      "Pierścionki",
      "Naszyjniki",
      "Bransoletki",
      "Kolekcja Ślubna",
      "Kolekcja Letnia",
    ])
  })

  it("defaults the locale when the caller sends none", async () => {
    await expect(trendingLabels()).resolves.toStrictEqual([
      "Pierścionki",
      "Naszyjniki",
      "Bransoletki",
      "Kolekcja Ślubna",
      "Kolekcja Letnia",
    ])
  })

  it("falls back to the other locale when the requested title is blank", async () => {
    sqlite.exec(`update product_category set titles = '${titles("Pierścionki", "")}' where id = 'cat-rings'`)

    await expect(trendingLabels("en-US")).resolves.toContain("Pierścionki")
  })

  it("drops a row whose title is blank in every locale", async () => {
    sqlite.exec(`update product_category set titles = '${titles("", "")}' where id = 'cat-rings'`)

    await expect(trendingLabels("en-US")).resolves.toStrictEqual(["Necklaces", "Bracelets", "Bridal", "Summer", "Winter"])
  })

  it("omits collections without any readable title while retaining category suggestions", async () => {
    sqlite.prepare("update product_collection set titles = ?").run(titles("", ""))

    const items = await getTrendingSearches({ data: { locale: "en-US" } })

    expect(items.map((item) => item.type)).toStrictEqual(["category", "category", "category"])
    expect(items.map((item) => item.label)).toStrictEqual(["Rings", "Necklaces", "Bracelets"])
  })

  it("keeps the stored image and falls back to the placeholder without one", async () => {
    const items = await getTrendingSearches({ data: { locale: "en-US" } })

    expect(items[0]?.image).toBe("categories/rings.jpg")
    expect(items[1]?.image).toBe(PLACEHOLDER_IMAGE)
  })

  it("suggests nothing while nothing is published", async () => {
    sqlite.exec("update product_category set status = 'draft'; update product_collection set status = 'draft';")

    await expect(getTrendingSearches({ data: { locale: "en-US" } })).resolves.toStrictEqual([])
  })

  it("rejects an empty locale", async () => {
    await expect(getTrendingSearches({ data: { locale: "" } })).rejects.toThrow()
  })
})

describe("getTrendingSearchesQuery", () => {
  it("keys the cache entry by locale", () => {
    expect(getTrendingSearchesQuery("en-US").queryKey).toStrictEqual([...STOREFRONT_SEARCH_QUERY_KEYS.TRENDING, "en-US"])
  })

  it("defaults the cache key to the default locale", () => {
    expect(getTrendingSearchesQuery().queryKey).toStrictEqual([...STOREFRONT_SEARCH_QUERY_KEYS.TRENDING, "pl-PL"])
  })
})

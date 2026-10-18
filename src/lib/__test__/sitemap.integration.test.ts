import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { listSitemapPages } from "~/src/lib/sitemap"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const day = (date: string): Date => new Date(`${date}T09:00:00.000Z`)

const titles = (title: string): string => JSON.stringify({ "en-US": title, "pl-PL": title })

interface ListingRow {
  readonly handle: string
  readonly rank: number
  readonly status: "active" | "draft"
  readonly updatedAt: Date
}

const insertListing = (table: "product_category" | "product_collection", { handle, rank, status, updatedAt }: ListingRow): void => {
  sqlite
    .prepare(`insert into ${table} (id, handle, titles, status, rank, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`)
    .run(`${table}-${handle}`, handle, titles(handle), status, rank, updatedAt.getTime(), updatedAt.getTime())
}

const insertProduct = (input: {
  readonly createdAt: Date
  readonly handle: string
  readonly rank: number
  readonly status: "archived" | "draft" | "published"
  readonly stock: readonly number[]
  readonly updatedAt: Date
}): void => {
  const productId = `product-${input.handle}`
  sqlite
    .prepare("insert into product (id, handle, titles, status, rank, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)")
    .run(productId, input.handle, titles(input.handle), input.status, input.rank, input.createdAt.getTime(), input.updatedAt.getTime())
  for (const [index, quantity] of input.stock.entries()) {
    const variantId = `${productId}-variant-${String(index)}`
    sqlite
      .prepare(
        "insert into product_variant (id, product_id, title, price, manage_inventory, created_at, updated_at) values (?, ?, ?, ?, 1, ?, ?)",
      )
      .run(variantId, productId, `Variant ${String(index)}`, 37_900, input.createdAt.getTime(), input.createdAt.getTime())
    sqlite
      .prepare(
        "insert into inventory (id, variant_id, quantity_available, quantity_reserved, created_at, updated_at) values (?, ?, ?, 0, ?, ?)",
      )
      .run(`inventory-${variantId}`, variantId, quantity, input.createdAt.getTime(), input.createdAt.getTime())
  }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec("delete from product_category; delete from product_collection;")
  sqlite.prepare("update content_page set updated_at = ? where handle = 'about'").run(day("2026-10-08").getTime())
  sqlite.prepare("update content_page set updated_at = ? where handle = 'exchanges-and-returns'").run(day("2026-10-05").getTime())
  sqlite.prepare("update content_page set updated_at = ? where handle = 'faq'").run(day("2026-10-07").getTime())
  sqlite.prepare("update content_page set updated_at = ? where handle = 'privacy-policy'").run(day("2026-09-29").getTime())
  sqlite.prepare("update content_page set updated_at = ? where handle = 'terms-of-service'").run(day("2026-10-06").getTime())

  insertListing("product_category", { handle: "rings", rank: 1, status: "active", updatedAt: day("2026-09-01") })
  insertListing("product_category", { handle: "necklaces", rank: 0, status: "active", updatedAt: day("2026-09-02") })
  insertListing("product_category", { handle: "unfinished", rank: 2, status: "draft", updatedAt: day("2026-09-03") })

  insertListing("product_collection", { handle: "summer", rank: 1, status: "active", updatedAt: day("2026-08-01") })
  insertListing("product_collection", { handle: "autumn", rank: 0, status: "draft", updatedAt: day("2026-08-02") })
  insertListing("product_collection", { handle: "winter", rank: 2, status: "active", updatedAt: day("2026-08-03") })

  insertProduct({
    createdAt: day("2026-07-01"),
    handle: "lapis",
    rank: 0,
    status: "published",
    stock: [0, 2],
    updatedAt: day("2026-10-01"),
  })
  insertProduct({ createdAt: day("2026-07-03"), handle: "onyx", rank: 1, status: "published", stock: [1], updatedAt: day("2026-10-02") })
  insertProduct({ createdAt: day("2026-07-02"), handle: "agate", rank: 1, status: "published", stock: [4], updatedAt: day("2026-10-03") })
  insertProduct({
    createdAt: day("2026-07-04"),
    handle: "sold-out",
    rank: 0,
    status: "published",
    stock: [0, 0],
    updatedAt: day("2026-10-04"),
  })
  insertProduct({
    createdAt: day("2026-07-05"),
    handle: "no-variants",
    rank: 0,
    status: "published",
    stock: [],
    updatedAt: day("2026-10-04"),
  })
  insertProduct({ createdAt: day("2026-07-06"), handle: "sketch", rank: 0, status: "draft", stock: [3], updatedAt: day("2026-10-04") })
  insertProduct({ createdAt: day("2026-07-07"), handle: "retired", rank: 0, status: "archived", stock: [3], updatedAt: day("2026-10-04") })
})

afterAll(() => {
  sqlite.close()
})

describe("listSitemapPages", () => {
  it("lists the storefront's public pages, then the About page, the legal pages and the FAQ, active categories and collections and sellable products", async () => {
    await expect(listSitemapPages()).resolves.toStrictEqual([
      { path: "/" },
      { path: "/products" },
      { path: "/categories" },
      { path: "/collections" },
      { path: "/withdraw-from-contract" },
      { lastModified: day("2026-10-08"), path: "/about" },
      { lastModified: day("2026-10-05"), path: "/exchanges-and-returns" },
      { lastModified: day("2026-10-07"), path: "/faq" },
      { lastModified: day("2026-09-29"), path: "/privacy-policy" },
      { lastModified: day("2026-10-06"), path: "/terms-of-service" },
      { lastModified: day("2026-09-02"), path: "/categories/necklaces" },
      { lastModified: day("2026-09-01"), path: "/categories/rings" },
      { lastModified: day("2026-08-01"), path: "/collections/summer" },
      { lastModified: day("2026-08-03"), path: "/collections/winter" },
      { lastModified: day("2026-10-01"), path: "/products/lapis" },
      { lastModified: day("2026-10-02"), path: "/products/onyx" },
      { lastModified: day("2026-10-03"), path: "/products/agate" },
    ])
  })

  it("leaves out the blog, the account, the cart, checkout, admin and the docs", async () => {
    const pages = await listSitemapPages()
    const paths = pages.map((page) => page.path)

    for (const privatePrefix of ["/blog", "/account", "/cart", "/checkout", "/admin", "/docs", "/auth", "/newsletter"]) {
      expect(paths.filter((path) => path.startsWith(privatePrefix))).toStrictEqual([])
    }
  })
})

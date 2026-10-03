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

const { LIST_PAGE_SIZE_MAX } = await import("~/src/modules/_core/utils/pagination")
const { inventory } = await import("~/src/modules/inventory/inventory.schema")
const { productVariant } = await import("~/src/modules/product-variant/product-variant.schema")
const { product } = await import("~/src/modules/product/product.schema")
const { getAvailabilityByVariantIds } = await import("~/src/modules/inventory/inventory.accessors")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const TABLES = [product, productVariant, inventory]

const NOW = 1_770_000_000_000

const insertStockedVariant = (variantId: string, quantityAvailable: number): void => {
  sqlite
    .prepare(`insert into product_variant (id, product_id, title, created_at, updated_at) values (?, 'p-ring', 'One size', ?, ?)`)
    .run(variantId, NOW, NOW)
  sqlite
    .prepare(`insert into inventory (id, variant_id, quantity_available, created_at, updated_at) values (?, ?, ?, ?, ?)`)
    .run(`inv-${variantId}`, variantId, quantityAvailable, NOW, NOW)
}

beforeEach(() => {
  createTables(sqlite, TABLES)
  sqlite
    .prepare(
      `insert into product (id, handle, rank, status, titles, created_at, updated_at)
       values ('p-ring', 'p-ring', 0, 'published', '{"en-US":"Ring"}', ?, ?)`,
    )
    .run(NOW, NOW)
})

afterAll(() => {
  sqlite.close()
})

describe("getAvailabilityByVariantIds", () => {
  it("reports the stock of every line in a cart holding a full page of different variants", async () => {
    const variantIds = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `var-${String(index).padStart(3, "0")}`)
    for (const [quantityAvailable, variantId] of variantIds.entries()) {
      insertStockedVariant(variantId, quantityAvailable)
    }
    insertStockedVariant("var-not-in-cart", 7)

    const availability = await getAvailabilityByVariantIds(variantIds)

    expect(availability).toStrictEqual(new Map(variantIds.map((variantId, quantityAvailable) => [variantId, quantityAvailable])))
  })

  it("leaves out a variant that has no inventory row", async () => {
    insertStockedVariant("var-stocked", 3)

    await expect(getAvailabilityByVariantIds(["var-stocked", "var-untracked"])).resolves.toStrictEqual(new Map([["var-stocked", 3]]))
  })
})

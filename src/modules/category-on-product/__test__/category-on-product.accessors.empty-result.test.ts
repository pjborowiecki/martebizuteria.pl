import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/sqlite-proxy")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  return { db: drizzle(() => Promise.resolve({ rows: [] }), { schema }) }
})

const { countProductsForCategories } = await import("~/src/modules/category-on-product/category-on-product.accessors")

describe("countProductsForCategories when the driver returns no aggregate row", () => {
  it("reports zero instead of an undefined count", async () => {
    await expect(countProductsForCategories(["cat-rings"])).resolves.toBe(0)
  })

  it("still reports zero for several requested categories", async () => {
    await expect(countProductsForCategories(["cat-rings", "cat-chains"])).resolves.toBe(0)
  })
})

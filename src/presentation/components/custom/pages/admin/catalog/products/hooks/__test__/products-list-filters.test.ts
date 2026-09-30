import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({
  DurableObject: Object,
  env: { VITE_R2_URL: "https://cdn.example.test" },
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/sqlite-proxy")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  return { db: drizzle(() => Promise.resolve({ rows: [] }), { schema }) }
})

const { hasProductsListFilters, hasProductsServerListQuery } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid")

describe("hasProductsListFilters", () => {
  it("reports an untouched toolbar as unfiltered", () => {
    expect(hasProductsListFilters({})).toBe(false)
  })

  it("reports each toolbar facet on its own", () => {
    expect(hasProductsListFilters({ categoryId: "cat-1" })).toBe(true)
    expect(hasProductsListFilters({ collectionId: "col-1" })).toBe(true)
    expect(hasProductsListFilters({ inventoryLevel: "low" })).toBe(true)
    expect(hasProductsListFilters({ status: "draft" })).toBe(true)
    expect(hasProductsListFilters({ variantKind: "single" })).toBe(true)
  })
})

describe("hasProductsServerListQuery", () => {
  it("keeps the list client side while nothing narrows it", () => {
    expect(hasProductsServerListQuery({}, "", {})).toBe(false)
  })

  it("moves to the server as soon as a toolbar facet is chosen", () => {
    expect(hasProductsServerListQuery({ status: "draft" }, "", {})).toBe(true)
  })

  it("moves to the server as soon as a search term is entered", () => {
    expect(hasProductsServerListQuery({}, "ring", {})).toBe(true)
  })

  it("moves to the server for a column filter", () => {
    expect(hasProductsServerListQuery({}, "", { totalStock: { amountMinorUnits: 5, operator: "gte" } })).toBe(true)
  })

  it("ignores an empty column filter object", () => {
    expect(hasProductsServerListQuery({}, "", {})).toBe(false)
  })
})

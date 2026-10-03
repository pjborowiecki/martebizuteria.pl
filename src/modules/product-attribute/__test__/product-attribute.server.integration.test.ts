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
const { productAttribute } = await import("~/src/modules/product-attribute/product-attribute.schema")
const { deleteProductAttributes, getProductAttributesByIds } = await import("~/src/modules/product-attribute/product-attribute.server")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const NOW = 1_770_000_000_000

const insertAttribute = (id: string): void => {
  sqlite
    .prepare(
      `insert into product_attribute (id, handle, rank, titles, type, created_at, updated_at)
       values (?, ?, 0, '{"en-US":"Metal"}', 'text', ?, ?)`,
    )
    .run(id, `handle-${id}`, NOW, NOW)
}

const insertAttributePage = (): string[] =>
  Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => {
    const id = `attr-${String(index).padStart(3, "0")}`
    insertAttribute(id)

    return id
  })

const attributeIds = (): unknown[] =>
  sqlite
    .prepare("select id from product_attribute order by id")
    .all()
    .map((row) => row["id"])

beforeEach(() => {
  createTables(sqlite, [productAttribute])
  insertAttribute("attr-kept")
})

afterAll(() => {
  sqlite.close()
})

describe("getProductAttributesByIds", () => {
  it("reads the handle of every attribute in a full page selection and nothing else", async () => {
    const selectedIds = insertAttributePage()

    const rows = await getProductAttributesByIds(selectedIds)

    expect(rows.toSorted((left, right) => left.id.localeCompare(right.id))).toStrictEqual(
      selectedIds.map((id) => ({ handle: `handle-${id}`, id })),
    )
  })
})

describe("deleteProductAttributes", () => {
  it("deletes a full page of selected attributes and keeps the rest", async () => {
    await deleteProductAttributes(insertAttributePage())

    expect(attributeIds()).toStrictEqual(["attr-kept"])
  })
})

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
import { countProductsForCollections } from "~/src/modules/collection-on-product/collection-on-product.accessors"

const DDL = `
  drop table if exists collection_on_product;
  create table collection_on_product (
    collection_id text not null, product_id text not null, rank integer not null default 0,
    primary key (product_id, collection_id)
  );
`

beforeEach(() => {
  sqlite.exec(DDL)
  sqlite.exec(`
    insert into collection_on_product (collection_id, product_id) values
      ('col-bridal', 'p-ring'),
      ('col-bridal', 'p-tiara'),
      ('col-summer', 'p-ring');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("countProductsForCollections", () => {
  it("counts the join rows of the requested collections only", async () => {
    await expect(countProductsForCollections(["col-bridal"])).resolves.toBe(2)
  })

  it("adds the join rows of a full page of selected collections", async () => {
    const bulkCollectionIds = Array.from({ length: LIST_PAGE_SIZE_MAX - 1 }, (_, index) => `col-bulk-${String(index)}`)
    const addRing = sqlite.prepare("insert into collection_on_product (collection_id, product_id) values (?, 'p-ring')")
    for (const collectionId of bulkCollectionIds) {
      addRing.run(collectionId)
    }

    await expect(countProductsForCollections(["col-bridal", ...bulkCollectionIds])).resolves.toBe(LIST_PAGE_SIZE_MAX + 1)
  })

  it("returns zero without querying for an empty request", async () => {
    await expect(countProductsForCollections([])).resolves.toBe(0)
  })
})

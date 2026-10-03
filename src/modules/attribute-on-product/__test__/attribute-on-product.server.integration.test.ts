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
import { countForAttributeIds } from "~/src/modules/attribute-on-product/attribute-on-product.server"

const DDL = `
  drop table if exists attribute_on_product;
  create table attribute_on_product (
    attribute_id text not null, id text primary key, product_id text not null, rank integer not null default 0,
    value text not null, variant_id text, created_at integer, updated_at integer
  );
`

const insertAttributeValue = (attributeId: string, productId: string): void => {
  sqlite
    .prepare("insert into attribute_on_product (id, attribute_id, product_id, value) values (?, ?, ?, 'gold')")
    .run(`${attributeId}-${productId}`, attributeId, productId)
}

beforeEach(() => {
  sqlite.exec(DDL)
  insertAttributeValue("attr-metal", "p-ring")
  insertAttributeValue("attr-metal", "p-chain")
  insertAttributeValue("attr-stone", "p-ring")
})

afterAll(() => {
  sqlite.close()
})

describe("countForAttributeIds", () => {
  it("counts the product values recorded for the requested attributes only", async () => {
    await expect(countForAttributeIds(["attr-metal"])).resolves.toBe(2)
  })

  it("adds the product values of a full page of selected attributes", async () => {
    const bulkAttributeIds = Array.from({ length: LIST_PAGE_SIZE_MAX - 1 }, (_, index) => `attr-bulk-${String(index)}`)
    for (const attributeId of bulkAttributeIds) {
      insertAttributeValue(attributeId, "p-ring")
    }

    await expect(countForAttributeIds(["attr-metal", ...bulkAttributeIds])).resolves.toBe(LIST_PAGE_SIZE_MAX + 1)
  })

  it("returns zero without querying for an empty request", async () => {
    await expect(countForAttributeIds([])).resolves.toBe(0)
  })
})

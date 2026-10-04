import { getTableName, is } from "drizzle-orm"
import { SQLiteColumn, SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core"
import { afterAll, describe, expect, it, vi } from "vite-plus/test"

import { type TestD1Query } from "~/src/platform/testing/mocks/d1"

const { queries, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    queries: [] as TestD1Query[],
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, (query) => {
        queries.push(query)
      }),
      { schema },
    ),
  }
})

const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { pageViewsQuery } = await import("~/src/modules/admin-dashboard/admin-dashboard.accessors")
const { getCustomerActivityAuditRows, getCustomerLoginAuditRows } =
  await import("~/src/modules/customer-account/customer-account.accessors.server")
const { getDiscountByCodeForCustomerQuery } = await import("~/src/modules/discount/discount.accessors")
const { getAdminSubscribersPage } = await import("~/src/modules/newsletter/newsletter.accessors")
const { getAdminOrderTimelineRows, getOrderByTransactionId } = await import("~/src/modules/order/order.accessors")
const { getPublishedProductsByCategoryIds, getPublishedProductsByCollectionHandle, getPublishedRelatedProducts } =
  await import("~/src/modules/product/product.accessors")
const { getCustomerAuditTimelineQuery } = await import("~/src/modules/user/user.accessors")

applyMigrationHistory(sqlite)

afterAll(() => {
  sqlite.close()
})

const textColumn = (rows: readonly Record<string, unknown>[], name: string): string[] => rows.map((row) => String(row[name]))

const planSteps = async (read: () => Promise<unknown>): Promise<string[]> => {
  queries.length = 0
  await read()

  return queries.flatMap((query) => textColumn(sqlite.prepare(`explain query plan ${query.sql}`).all(...query.params), "detail"))
}

const indexedPrefixes = (table: string): string[][] => {
  const primaryKey = sqlite
    .prepare(`select name from pragma_table_info(?) where pk > 0 order by pk`)
    .all(table)
    .map((row) => String(row["name"]))
  const indexes = textColumn(sqlite.prepare(`select name from pragma_index_list(?)`).all(table), "name").map((index) =>
    textColumn(sqlite.prepare(`select name from pragma_index_info(?) order by seqno`).all(index), "name"),
  )

  return [primaryKey, ...indexes]
}

const unindexedForeignKeys = (table: string): string[] => {
  const keys = Map.groupBy(sqlite.prepare(`select id, "from" from pragma_foreign_key_list(?)`).all(table), (row) => Number(row["id"]))
  const prefixes = indexedPrefixes(table)

  return [...keys.values()]
    .map((rows) => textColumn(rows, "from"))
    .filter((columns) => !prefixes.some((prefix) => columns.every((column, position) => prefix[position] === column)))
    .map((columns) => `${table}(${columns.join(", ")})`)
}

describe("foreign keys", () => {
  it("are all indexed, so deleting a parent row never scans its children", () => {
    const tables = textColumn(
      sqlite.prepare(`select name from sqlite_master where type = 'table' and sql not like 'CREATE VIRTUAL%'`).all(),
      "name",
    )

    expect(tables.flatMap((table) => unindexedForeignKeys(table))).toStrictEqual([])
  })
})

describe("schema indexes", () => {
  it("all exist in the database the migrations build, on the same columns", () => {
    const tables = Object.values(schema).flatMap((value) => (is(value, SQLiteTable) ? [value] : []))
    const declared = tables.flatMap((table) =>
      getTableConfig(table)
        .indexes.filter((index) => index.config.columns.every((column) => column instanceof SQLiteColumn))
        .map((index) => ({
          columns: index.config.columns.map((column) => (column instanceof SQLiteColumn ? column.name : "")),
          index: index.config.name,
          table: getTableName(table),
        })),
    )
    const built = declared.map(({ index }) => ({
      columns: textColumn(sqlite.prepare(`select name from pragma_index_info(?) order by seqno`).all(index), "name"),
      index,
      table: textColumn(sqlite.prepare(`select tbl_name from sqlite_master where type = 'index' and name = ?`).all(index), "tbl_name")[0],
    }))

    expect(built).toStrictEqual(declared)
  })
})

describe("hot reads", () => {
  it("find the order behind a Stripe session by its payment instead of scanning every order", async () => {
    await expect(planSteps(() => getOrderByTransactionId("cs_test_session"))).resolves.toContain(
      "SEARCH order USING INDEX order_paymentId_idx (payment_id=?)",
    )
  })

  it.each([
    ["an order's timeline", () => getAdminOrderTimelineRows("order-1")],
    ["a customer's timeline", () => getCustomerAuditTimelineQuery("user-1")],
    ["a customer's sign-ins", () => getCustomerLoginAuditRows("user-1")],
    ["a customer's account activity across their orders", () => getCustomerActivityAuditRows("user-1", ["order-1", "order-2"])],
  ])("read %s by resource and action instead of walking every event of those actions", async (_label, read) => {
    await expect(planSteps(read)).resolves.toContain(
      "SEARCH audit_log USING INDEX audit_log_resourceId_action_createdAt_idx (resource_id=? AND action=?)",
    )
  })

  it("count recent storefront page views from the index alone, without walking older ones", async () => {
    await expect(planSteps(() => pageViewsQuery(new Date("2026-09-01T00:00:00.000Z")))).resolves.toContain(
      "SEARCH audit_log USING COVERING INDEX audit_log_action_createdAt_idx (action=? AND created_at>?)",
    )
  })

  it("list a collection's published products by its handle and membership instead of scanning every collection", async () => {
    await expect(planSteps(() => getPublishedProductsByCollectionHandle("nowosci", { limit: 9, offset: 0 }))).resolves.toStrictEqual(
      expect.arrayContaining([
        "SEARCH product_collection USING INDEX product_collection_handle_unique (handle=?)",
        "SEARCH collection_on_product USING INDEX collection_on_product_collection_rank_idx (collection_id=?)",
      ]),
    )
  })

  it("list the published products of several categories by membership instead of scanning every category link", async () => {
    await expect(
      planSteps(() => getPublishedProductsByCategoryIds(["category-1", "category-2"], { limit: 3, offset: 0 })),
    ).resolves.toContain("SEARCH category_on_product USING INDEX category_on_product_category_id_idx (category_id=?)")
  })

  it("list a product's related products by its category's membership instead of scanning every category link", async () => {
    await expect(planSteps(() => getPublishedRelatedProducts("category-1", "product-1"))).resolves.toContain(
      "SEARCH category_on_product USING INDEX category_on_product_category_id_idx (category_id=?)",
    )
  })

  it("page newsletter subscribers newest first without sorting the whole list", async () => {
    await expect(planSteps(() => getAdminSubscribersPage({ limit: 25, offset: 0 }))).resolves.not.toContain("USE TEMP B-TREE FOR ORDER BY")
  })

  it("read a discount by its code and count the customer's redemptions of it from their indexes", async () => {
    await expect(planSteps(() => getDiscountByCodeForCustomerQuery("SPRING-24", "ada@marte.test"))).resolves.toStrictEqual(
      expect.arrayContaining([
        "SEARCH discount USING INDEX discount_code_unique (code=?)",
        "SEARCH discount_redemption USING COVERING INDEX discount_redemption_discountId_email_idx (discount_id=?)",
      ]),
    )
  })
})

import { type DatabaseSync } from "node:sqlite"

const STATEMENT_BREAKPOINT = "--> statement-breakpoint"

const MIGRATION_DIRECTORY = "../../../integrations/drizzle-orm/migrations"

const MIGRATION_SQL = import.meta.glob<string>("../../../integrations/drizzle-orm/migrations/*.sql", {
  eager: true,
  import: "default",
  query: "?raw",
})

export const MIGRATION = {
  CONTENT_PAGES: "20261002120000_content_pages",
  ORDER_ITEM_PRODUCT_BACKFILL: "20261003120000_order_item_product_backfill",
  STOREFRONT_SEARCH: "20261002100000_storefront_search",
} as const

export const applyMigration = (sqlite: DatabaseSync, migration: (typeof MIGRATION)[keyof typeof MIGRATION]): void => {
  const sql = MIGRATION_SQL[`${MIGRATION_DIRECTORY}/${migration}.sql`]
  if (sql === undefined) {
    throw new Error(`Missing migration ${migration}`)
  }

  for (const statement of sql.split(STATEMENT_BREAKPOINT)) {
    sqlite.exec(statement)
  }
}

export const applyMigrationHistory = (sqlite: DatabaseSync): void => {
  const history = Object.entries(MIGRATION_SQL).toSorted(([left], [right]) => left.localeCompare(right))
  for (const [, sql] of history) {
    for (const statement of sql.split(STATEMENT_BREAKPOINT)) {
      sqlite.exec(statement)
    }
  }
}

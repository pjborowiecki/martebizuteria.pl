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
  DELIVERY_METHOD_DESCRIPTIONS: "20261010220000_delivery_method_descriptions",
  ORDER_ITEM_PRODUCT_BACKFILL: "20261003120000_order_item_product_backfill",
  ORDER_RESTOCKED_AT: "20261005410000_order_restocked_at",
  PRIVACY_POLICY_ACCOUNT_DELETION: "20261010210000_privacy_policy_account_deletion",
  PRIVACY_POLICY_PAGE: "20261010200000_privacy_policy_page",
  RETURNS_AND_COMPLAINTS_PAGE: "20261005210000_returns_and_complaints_page",
  STOREFRONT_SEARCH: "20261002100000_storefront_search",
  STORE_SETTINGS: "20261005420000_store_settings",
  TERMS_OF_SERVICE_PAGE: "20261005200000_terms_of_service_page",
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

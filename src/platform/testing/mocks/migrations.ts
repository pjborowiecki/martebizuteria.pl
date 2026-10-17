import { type DatabaseSync } from "node:sqlite"

const STATEMENT_BREAKPOINT = "--> statement-breakpoint"

const MIGRATION_DIRECTORY = "../../../integrations/drizzle-orm/migrations"

const MIGRATION_SQL = import.meta.glob<string>("../../../integrations/drizzle-orm/migrations/*.sql", {
  eager: true,
  import: "default",
  query: "?raw",
})

export const MIGRATION = {
  CART_ABANDONED_WITHOUT_NAME: "20261017100000_cart_abandoned_without_name",
  CLAIM_PAST_GUEST_ORDERS: "20261016140000_claim_past_guest_orders",
  CONTENT_PAGES: "20261002120000_content_pages",
  DELIVERY_METHOD_DESCRIPTIONS: "20261010220000_delivery_method_descriptions",
  DELIVERY_METHOD_NAMES: "20261016150000_delivery_method_names",
  DELIVERY_METHOD_SETTINGS: "20261016151000_delivery_method_settings",
  FAQ_PAGE: "20261010232000_faq_page",
  FREE_DELIVERY_THRESHOLD: "20261016152000_free_delivery_threshold",
  ORDER_DELIVERED_EMAIL: "20261015300000_order_delivered_email",
  ORDER_FULFILLMENT_STARTED: "20261015200000_order_fulfillment_started",
  ORDER_ITEM_PRODUCT_BACKFILL: "20261003120000_order_item_product_backfill",
  ORDER_RESTOCKED_AT: "20261005410000_order_restocked_at",
  ORDER_SHIPPED_EMAIL: "20261015150000_order_shipped_email",
  ORDER_WITHDRAWALS: "20261010230000_order_withdrawals",
  PRICE_HISTORY: "20261010410000_price_history",
  PRIVACY_POLICY_ACCOUNT_DELETION: "20261010210000_privacy_policy_account_deletion",
  PRIVACY_POLICY_PAGE: "20261010200000_privacy_policy_page",
  PRIVACY_POLICY_WITHOUT_BOT_CHECK: "20261012100000_privacy_policy_without_bot_check",
  RETURNS_AND_COMPLAINTS_PAGE: "20261005210000_returns_and_complaints_page",
  SELLER_DETAILS: "20261016160000_seller_details",
  SELLER_PLACEHOLDERS: "20261016161000_seller_placeholders",
  STOREFRONT_SEARCH: "20261002100000_storefront_search",
  STORE_SETTINGS: "20261005420000_store_settings",
  TERMS_OF_SERVICE_PAGE: "20261005200000_terms_of_service_page",
  WITHDRAWAL_FUNCTION_LINKS: "20261010231000_withdrawal_function_links",
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

const applyHistory = (sqlite: DatabaseSync, include: (path: string) => boolean): void => {
  const history = Object.entries(MIGRATION_SQL).toSorted(([left], [right]) => left.localeCompare(right))
  for (const [, sql] of history.filter(([path]) => include(path))) {
    for (const statement of sql.split(STATEMENT_BREAKPOINT)) {
      sqlite.exec(statement)
    }
  }
}

export const applyMigrationHistory = (sqlite: DatabaseSync): void => {
  applyHistory(sqlite, () => true)
}

export const applyMigrationHistoryBefore = (sqlite: DatabaseSync, migration: (typeof MIGRATION)[keyof typeof MIGRATION]): void => {
  applyHistory(sqlite, (path) => path.localeCompare(`${MIGRATION_DIRECTORY}/${migration}.sql`) < 0)
}

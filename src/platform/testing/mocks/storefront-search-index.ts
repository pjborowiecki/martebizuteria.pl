import { readFileSync } from "node:fs"
import { type DatabaseSync } from "node:sqlite"

const MIGRATION = new URL("../../../integrations/drizzle-orm/migrations/20261002100000_storefront_search.sql", import.meta.url)

const STATEMENT_BREAKPOINT = "--> statement-breakpoint"

export const createStorefrontSearchIndex = (sqlite: DatabaseSync): void => {
  for (const statement of readFileSync(MIGRATION, "utf8").split(STATEMENT_BREAKPOINT)) {
    sqlite.exec(statement)
  }
}

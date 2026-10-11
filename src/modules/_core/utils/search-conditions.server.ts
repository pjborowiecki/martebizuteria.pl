import { type SQL, or, sql } from "drizzle-orm"
import { type SQLiteColumn } from "drizzle-orm/sqlite-core"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const normalizeAdminSearchTerm = (search: string | undefined): string | undefined => {
  const trimmed = search?.trim() ?? ""

  return trimmed === "" ? undefined : trimmed
}

export const localizedTextColumns = (column: SQLiteColumn): SQL[] =>
  I18N.SUPPORTED_LOCALES.map((locale) => sql`json_extract(${column}, ${`$."${locale}"`})`)

export const containsAdminSearchTerm = (column: AdminSearchColumn, term: string): SQL =>
  sql`instr(lower(cast(${column} as text)), lower(${term})) > 0`

export const buildAdminSearchOrCondition = (search: string | undefined, columns: readonly AdminSearchColumn[]): SQL | undefined => {
  const normalized = normalizeAdminSearchTerm(search)
  if (normalized === undefined || columns.length === 0) {
    return undefined
  }

  const term = normalized.toLowerCase()

  return or(...columns.map((column) => containsAdminSearchTerm(column, term)))
}

type AdminSearchColumn = SQLiteColumn | SQL

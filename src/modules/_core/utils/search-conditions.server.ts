import { type SQL, or, sql } from "drizzle-orm"
import { type SQLiteColumn } from "drizzle-orm/sqlite-core"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const normalizeAdminSearchTerm = (search: string | undefined): string | undefined => {
  const trimmed = search?.trim() ?? ""

  return trimmed === "" ? undefined : trimmed
}

const escapeLikePattern = (term: string): string =>
  term
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("%", String.raw`\%`)
    .replaceAll("_", String.raw`\_`)

export const localizedTextColumns = (column: SQLiteColumn): SQL[] =>
  I18N.SUPPORTED_LOCALES.map((locale) => sql`json_extract(${column}, ${`$."${locale}"`})`)

export const buildAdminLikePattern = (term: string): string => `%${escapeLikePattern(term)}%`

const buildColumnLikeCondition = (column: AdminSearchColumn, pattern: string): SQL =>
  sql`lower(cast(${column} as text)) like ${pattern} escape '\\'`

export const buildAdminSearchOrCondition = (search: string | undefined, columns: readonly AdminSearchColumn[]): SQL | undefined => {
  const normalized = normalizeAdminSearchTerm(search)
  if (normalized === undefined || columns.length === 0) {
    return undefined
  }

  const pattern = buildAdminLikePattern(normalized.toLowerCase())
  const conditions = columns.map((column) => buildColumnLikeCondition(column, pattern))

  return or(...conditions)
}

type AdminSearchColumn = SQLiteColumn | SQL

import { or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export { ADMIN_SEARCH_DEBOUNCE_MS } from "~/src/lib/_utils/admin-search";

const EMPTY_COLUMNS = 0;
const SINGLE_CONDITION = 1;
const FIRST_CONDITION = 0;

type AdminSearchColumn = SQLiteColumn | SQL;

export function normalizeAdminSearchTerm(search: string | undefined): string | undefined {
  const trimmed = search?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

function escapeLikePattern(term: string): string {
  return term
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("%", String.raw`\%`)
    .replaceAll("_", String.raw`\_`);
}

export function buildAdminLikePattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}

function buildColumnLikeCondition(column: AdminSearchColumn, pattern: string): SQL {
  return sql`${column} like ${pattern}`;
}

/** Case-insensitive substring match across one or more text columns (OR). */
export function buildAdminSearchOrCondition(search: string | undefined, columns: readonly AdminSearchColumn[]): SQL | undefined {
  const normalized = normalizeAdminSearchTerm(search);
  if (normalized === undefined || columns.length === EMPTY_COLUMNS) {
    return undefined;
  }

  const pattern = buildAdminLikePattern(normalized);
  const conditions = columns.map((column) => buildColumnLikeCondition(column, pattern));

  if (conditions.length === SINGLE_CONDITION) {
    return conditions[FIRST_CONDITION];
  }

  return or(...conditions);
}

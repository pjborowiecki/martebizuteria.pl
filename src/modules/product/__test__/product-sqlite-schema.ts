import { getTableName } from "drizzle-orm"
import { SQLiteColumn, type SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core"
import { type DatabaseSync } from "node:sqlite"

const literal = (value: unknown): string | undefined => {
  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0"
  }

  if (typeof value === "string") {
    return `'${value.replaceAll("'", "''")}'`
  }

  return undefined
}

const columnDefinition = (column: ReturnType<typeof getTableConfig>["columns"][number], singlePrimary: boolean): string => {
  const parts = [`"${column.name}"`, column.getSQLType()]
  if (singlePrimary && column.primary) {
    parts.push("primary key")
  } else if (column.notNull) {
    parts.push("not null")
  }

  const fallback = literal(column.default)
  if (fallback !== undefined) {
    parts.push(`default ${fallback}`)
  }

  return parts.join(" ")
}

export const createTableStatement = (table: SQLiteTable): string => {
  const config = getTableConfig(table)
  const compositeKeys = config.primaryKeys.map((key) => key.columns.map((column) => `"${column.name}"`))
  const singlePrimary = compositeKeys.length === 0
  const definitions = config.columns.map((column) => columnDefinition(column, singlePrimary))
  for (const columns of compositeKeys) {
    definitions.push(`primary key (${columns.join(", ")})`)
  }

  for (const key of config.foreignKeys) {
    const reference = key.reference()
    const columns = reference.columns.map((column) => `"${column.name}"`).join(", ")
    const foreignColumns = reference.foreignColumns.map((column) => `"${column.name}"`).join(", ")
    const action = key.onDelete === undefined ? "" : ` on delete ${key.onDelete}`

    definitions.push(`foreign key (${columns}) references "${getTableName(reference.foreignTable)}" (${foreignColumns})${action}`)
  }

  return `create table "${getTableName(table)}" (${definitions.join(", ")})`
}

export const createUniqueIndexStatements = (table: SQLiteTable): string[] => {
  const config = getTableConfig(table)
  const tableName = getTableName(table)
  const uniqueColumns = config.columns.filter((column) => column.isUnique).map((column) => [column.name])
  const uniqueIndexes = config.indexes
    .filter((index) => index.config.unique)
    .map((index) => index.config.columns)
    .filter((columns): columns is SQLiteColumn[] => columns.every((column) => column instanceof SQLiteColumn))
    .map((columns) => columns.map((column) => column.name))

  return [...uniqueColumns, ...uniqueIndexes].map(
    (columns) =>
      `create unique index "${tableName}_${columns.join("_")}_unique" on "${tableName}" (${columns.map((name) => `"${name}"`).join(", ")})`,
  )
}

export const createTables = (sqlite: DatabaseSync, tables: readonly SQLiteTable[]): void => {
  sqlite.exec("pragma foreign_keys = off")
  for (const table of tables) {
    sqlite.exec(`drop table if exists "${getTableName(table)}"`)
  }

  for (const table of tables) {
    sqlite.exec(createTableStatement(table))
    for (const statement of createUniqueIndexStatements(table)) {
      sqlite.exec(statement)
    }
  }
  sqlite.exec("pragma foreign_keys = on")
}

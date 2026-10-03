import { type Table, getTableColumns } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

export const D1_MAX_BOUND_PARAMETERS = 100

export const chunkByBoundParameters = <TRow>(rows: readonly TRow[], parametersPerRow: number, fixedParameters = 0): TRow[][] => {
  const rowsPerStatement = Math.floor((D1_MAX_BOUND_PARAMETERS - fixedParameters) / parametersPerRow)

  return Array.from({ length: Math.ceil(rows.length / rowsPerStatement) }, (_, index) =>
    rows.slice(index * rowsPerStatement, (index + 1) * rowsPerStatement),
  )
}

export const insertRowChunks = <TRow>(table: Table, rows: readonly TRow[]): TRow[][] =>
  chunkByBoundParameters(rows, Object.keys(getTableColumns(table)).length)

export const runDrizzleBatch = async (statements: readonly DrizzleBatchStatement[]): Promise<void> => {
  if (statements.length === 0) {
    return
  }

  const [first, ...rest] = statements
  if (first === undefined) {
    return
  }
  await db.batch([first, ...rest])
}

export type DrizzleBatchStatement = BatchItem<"sqlite">

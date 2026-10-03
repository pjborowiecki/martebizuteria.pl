import { type SQL, type Table, getTableColumns, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

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

const RANK_CASE_PARAMETERS_PER_ROW = 2

const JSON_LIST_PARAMETERS = 1

export const chunkRankUpdates = (idColumn: AnySQLiteColumn, updates: readonly RankUpdate[]): RankUpdateChunk[] =>
  chunkByBoundParameters(updates, RANK_CASE_PARAMETERS_PER_ROW, JSON_LIST_PARAMETERS).map((chunk) => {
    const cases = chunk.map((entry) => sql`when ${idColumn} = ${entry.id} then ${entry.rank}`)

    return {
      ids: chunk.map((entry) => entry.id),
      rank: sql<number>`(case ${sql.join(cases, sql.raw(" "))} end)`,
    }
  })

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

export interface RankUpdate {
  readonly id: string
  readonly rank: number
}

interface RankUpdateChunk {
  readonly ids: string[]
  readonly rank: SQL<number>
}

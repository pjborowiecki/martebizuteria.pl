import { type DatabaseSync, type SQLInputValue } from "node:sqlite"
/** In-memory D1 statement transport for exercising real Drizzle queries in Node. */
export const createTestD1Database = (sqlite: DatabaseSync, onQuery?: (query: TestD1Query) => void): D1Database => {
  const prepare = (sql: string, params: SQLInputValue[] = []) => ({
    all() {
      onQuery?.({
        params,
        sql,
      })
      return Promise.resolve({
        results: sqlite.prepare(sql).all(...params),
        success: true,
      })
    },
    bind(...values: SQLInputValue[]) {
      return prepare(sql, values)
    },
    raw() {
      onQuery?.({
        params,
        sql,
      })
      const statement = sqlite.prepare(sql)
      statement.setReturnArrays(true)
      return Promise.resolve(statement.all(...params))
    },
    run() {
      onQuery?.({
        params,
        sql,
      })
      return Promise.resolve({
        meta: sqlite.prepare(sql).run(...params),
        success: true,
      })
    },
  })
  const client = {
    async batch(statements: ReturnType<typeof prepare>[]) {
      sqlite.exec("begin")
      try {
        const results = await Promise.all(statements.map((statement) => statement.all()))
        sqlite.exec("commit")
        return results
      } catch (error) {
        sqlite.exec("rollback")
        throw error
      }
    },
    prepare,
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- This local transport implements only the D1 methods exercised by integration tests.
  return client as unknown as D1Database
}
export interface TestD1Query {
  readonly params: SQLInputValue[]
  readonly sql: string
}

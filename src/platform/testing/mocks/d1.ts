import { type DatabaseSync, type SQLInputValue } from "node:sqlite"

const D1_MAX_BOUND_PARAMETERS = 100

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
      if (values.length > D1_MAX_BOUND_PARAMETERS) {
        throw new Error(`D1_ERROR: too many SQL variables: ${String(values.length)} bound, D1 allows ${String(D1_MAX_BOUND_PARAMETERS)}`)
      }

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

  return client as unknown as D1Database
}

export interface TestD1Query {
  readonly params: SQLInputValue[]
  readonly sql: string
}

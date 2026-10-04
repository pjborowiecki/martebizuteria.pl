import { type DatabaseSync, type SQLInputValue } from "node:sqlite"

const D1_MAX_BOUND_PARAMETERS = 100

export const createTestD1Database = (
  sqlite: DatabaseSync,
  onQuery?: (query: TestD1Query) => void,
  onRoundTrip?: (trip: TestD1RoundTrip) => void,
): D1Database => {
  const recordAndPrepare = (query: TestD1Query) => {
    onQuery?.(query)

    return sqlite.prepare(query.sql)
  }

  const readRows = (query: TestD1Query) => ({
    results: recordAndPrepare(query).all(...query.params),
    success: true,
  })

  const prepare = (sql: string, params: SQLInputValue[] = []) => {
    const query = { params, sql }

    return {
      all() {
        onRoundTrip?.({ kind: "statement", sql: [sql] })

        return Promise.resolve(readRows(query))
      },
      bind(...values: SQLInputValue[]) {
        if (values.length > D1_MAX_BOUND_PARAMETERS) {
          throw new Error(`D1_ERROR: too many SQL variables: ${String(values.length)} bound, D1 allows ${String(D1_MAX_BOUND_PARAMETERS)}`)
        }

        return prepare(sql, values)
      },
      query,
      raw() {
        onRoundTrip?.({ kind: "statement", sql: [sql] })

        const statement = recordAndPrepare(query)
        statement.setReturnArrays(true)

        return Promise.resolve(statement.all(...params))
      },
      run() {
        onRoundTrip?.({ kind: "statement", sql: [sql] })

        return Promise.resolve({
          meta: recordAndPrepare(query).run(...params),
          success: true,
        })
      },
    }
  }

  const runBatch = (queries: TestD1Query[]) => {
    sqlite.exec("begin")
    try {
      const results = queries.map((query) => readRows(query))
      sqlite.exec("commit")

      return results
    } catch (error) {
      sqlite.exec("rollback")

      throw error
    }
  }

  const pending = { batches: Promise.resolve() }

  const client = {
    batch(statements: ReturnType<typeof prepare>[]) {
      const queries = statements.map((statement) => statement.query)
      onRoundTrip?.({ kind: "batch", sql: queries.map((query) => query.sql) })

      const results = pending.batches.then(() => runBatch(queries))
      pending.batches = results.then(
        () => {},
        () => {},
      )

      return results
    },
    prepare,
  }

  return client as unknown as D1Database
}

export interface TestD1Query {
  readonly params: SQLInputValue[]
  readonly sql: string
}

export interface TestD1RoundTrip {
  readonly kind: "batch" | "statement"
  readonly sql: readonly string[]
}

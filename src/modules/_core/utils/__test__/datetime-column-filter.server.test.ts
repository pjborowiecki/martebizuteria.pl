import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect, integer, sqliteTable } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR, DATE_COLUMN_FILTER_OPERATORS } from "~/src/modules/_core/utils/column-filters"
import { buildAdminDateTimeFilterSql } from "~/src/modules/_core/utils/datetime-column-filter.server"

const auditEvent = sqliteTable("audit_event", {
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
})

const dialect = new SQLiteSyncDialect()

const render = (fragment: SQL): { readonly params: readonly unknown[]; readonly sql: string } => {
  const query = dialect.sqlToQuery(fragment)

  return { params: query.params, sql: query.sql }
}

const build = (filter: Parameters<typeof buildAdminDateTimeFilterSql>[1]) =>
  render(buildAdminDateTimeFilterSql(auditEvent.occurredAt, filter))

const RANGE_SQL = `("audit_event"."occurred_at" >= ? and "audit_event"."occurred_at" < ?)`

describe("buildAdminDateTimeFilterSql with the on operator", () => {
  it("spans the whole day in Poland, from its midnight to the next, whatever zone the Worker runs in", () => {
    const { params, sql } = build({ date: "2026-10-15", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(sql).toBe(RANGE_SQL)
    expect(params).toStrictEqual([Date.parse("2026-10-14T22:00:00.000Z"), Date.parse("2026-10-15T22:00:00.000Z")])
  })

  it("starts a winter day an hour later in UTC than a summer one", () => {
    expect(build({ date: "2026-01-15", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).params).toStrictEqual([
      Date.parse("2026-01-14T23:00:00.000Z"),
      Date.parse("2026-01-15T23:00:00.000Z"),
    ])
  })

  it("spans all 25 hours of the day the clocks go back", () => {
    expect(build({ date: "2026-10-25", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).params).toStrictEqual([
      Date.parse("2026-10-24T22:00:00.000Z"),
      Date.parse("2026-10-25T23:00:00.000Z"),
    ])
  })

  it("still spans the whole day when the value carries a time", () => {
    expect(build({ date: "2026-10-15T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).params).toStrictEqual(
      build({ date: "2026-10-15", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).params,
    )
  })

  it("matches every row when the date is missing", () => {
    const { params, sql } = build({ operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(sql).toBe("1 = 1")
    expect(params).toStrictEqual([])
  })
})

describe("buildAdminDateTimeFilterSql with the before and after operators", () => {
  it("keeps only what happened before the chosen minute on the Polish clock", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })

    expect(sql).toBe(`"audit_event"."occurred_at" < ?`)
    expect(params).toStrictEqual([Date.parse("2024-06-10T06:30:00.000Z")])
  })

  it("keeps only what happened once the chosen minute on the Polish clock was over", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER })

    expect(sql).toBe(`"audit_event"."occurred_at" >= ?`)
    expect(params).toStrictEqual([Date.parse("2024-06-10T06:31:00.000Z")])
  })

  it("compares a date without a time against the Polish day's midnights", () => {
    expect(build({ date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE }).params).toStrictEqual([
      Date.parse("2024-06-09T22:00:00.000Z"),
    ])
    expect(build({ date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER }).params).toStrictEqual([
      Date.parse("2024-06-10T22:00:00.000Z"),
    ])
  })

  it("binds epoch milliseconds, the only shape a D1 statement accepts", () => {
    const { params } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })

    expect(params[0]).toBeTypeOf("number")
  })

  it.each([[DATE_COLUMN_FILTER_OPERATOR.BEFORE], [DATE_COLUMN_FILTER_OPERATOR.AFTER]])(
    "matches every row when the %s operator has no date",
    (operator) => {
      expect(build({ operator }).sql).toBe("1 = 1")
    },
  )
})

describe("buildAdminDateTimeFilterSql with the between operator", () => {
  it("spans from the start minute to the end of the closing minute on the Polish clock", () => {
    const { params, sql } = build({
      endDate: "2024-06-12T18:00",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-06-10T08:30",
    })

    expect(sql).toBe(RANGE_SQL)
    expect(params).toStrictEqual([Date.parse("2024-06-10T06:30:00.000Z"), Date.parse("2024-06-12T16:01:00.000Z")])
  })

  it("leaves an inverted range inverted, so it selects nothing", () => {
    const { params } = build({
      endDate: "2024-06-10T08:30",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-06-12T18:00",
    })
    const [start, end] = params

    expect(typeof start === "number" && typeof end === "number" && start > end).toBe(true)
  })

  it.each([
    [{ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-10T08:30" }],
    [{ endDate: "2024-06-12T18:00", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN }],
    [{ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN }],
  ])("matches every row for the incomplete range %j", (filter) => {
    expect(build(filter).sql).toBe("1 = 1")
  })
})

const retiredOperator = <TOperator extends string>(operators: readonly TOperator[], name: string): TOperator =>
  operators.find((operator) => operator === name)!

describe("buildAdminDateTimeFilterSql with an operator it does not know", () => {
  it("matches every row instead of guessing at a bound", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: retiredOperator(DATE_COLUMN_FILTER_OPERATORS, "sometime") })

    expect(sql).toBe("1 = 1")
    expect(params).toStrictEqual([])
  })
})

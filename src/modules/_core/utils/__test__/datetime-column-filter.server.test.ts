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

const JUNE = 5

describe("buildAdminDateTimeFilterSql with the on operator", () => {
  it("spans the selected minute when a time is supplied", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(sql).toBe(`("audit_event"."occurred_at" >= ? and "audit_event"."occurred_at" <= ?)`)
    expect(params).toStrictEqual([new Date(2024, JUNE, 10, 8, 30).getTime(), new Date(2024, JUNE, 10, 8, 30, 59, 999).getTime()])
  })

  it("spans the whole day when only a date is supplied", () => {
    const { params } = build({ date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(params).toStrictEqual([new Date(2024, JUNE, 10).getTime(), new Date(2024, JUNE, 10, 23, 59, 59, 999).getTime()])
  })

  it("encodes the bounds as epoch milliseconds the driver can bind", () => {
    const { params } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(params.every((value) => typeof value === "number")).toBe(true)
  })

  it("matches every row when the date is missing", () => {
    const { params, sql } = build({ operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(sql).toBe("1 = 1")
    expect(params).toStrictEqual([])
  })
})

describe("buildAdminDateTimeFilterSql with the before and after operators", () => {
  it("compares against the start of the selected minute when filtering before", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })

    expect(sql).toBe(`"audit_event"."occurred_at" < ?`)
    expect(params).toStrictEqual([new Date(2024, JUNE, 10, 8, 30).getTime()])
  })

  it("compares against the end of the selected minute when filtering after", () => {
    const { params, sql } = build({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER })

    expect(sql).toBe(`"audit_event"."occurred_at" > ?`)
    expect(params).toStrictEqual([new Date(2024, JUNE, 10, 8, 30, 59, 999).getTime()])
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
  it("spans from the start minute to the end of the closing minute", () => {
    const { params, sql } = build({
      endDate: "2024-06-12T18:00",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-06-10T08:30",
    })

    expect(sql).toBe(`("audit_event"."occurred_at" >= ? and "audit_event"."occurred_at" <= ?)`)
    expect(params).toStrictEqual([new Date(2024, JUNE, 10, 8, 30).getTime(), new Date(2024, JUNE, 12, 18, 0, 59, 999).getTime()])
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

import { type SQL, sql } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATORS,
  NUMERIC_COLUMN_FILTER_OPERATOR,
  NUMERIC_COLUMN_FILTER_OPERATORS,
} from "~/src/modules/_core/utils/column-filters"
import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/modules/_core/utils/column-filters.server"
import {
  buildAdminLikePattern,
  buildAdminSearchOrCondition,
  normalizeAdminSearchTerm,
} from "~/src/modules/_core/utils/search-conditions.server"

const column = sql`total`

const isNestedFragment = (chunk: unknown): chunk is { readonly queryChunks: readonly unknown[] } =>
  typeof chunk === "object" && chunk !== null && "queryChunks" in chunk && Array.isArray(chunk.queryChunks)

const isBoundValue = (chunk: unknown): boolean =>
  chunk instanceof Date || typeof chunk === "string" || typeof chunk === "number" || typeof chunk === "boolean"

const collectParams = (chunks: readonly unknown[]): unknown[] =>
  chunks.flatMap((chunk) => {
    if (isNestedFragment(chunk)) {
      return collectParams(chunk.queryChunks)
    }

    return isBoundValue(chunk) ? [chunk] : []
  })

const params = (fragment: SQL): unknown[] => collectParams(fragment.queryChunks)

const renderShape = (chunks: readonly unknown[]): string =>
  chunks
    .map((chunk) => {
      if (isNestedFragment(chunk)) {
        return renderShape(chunk.queryChunks)
      }

      return isBoundValue(chunk) ? "?" : JSON.stringify(chunk)
    })
    .join("")

const isAlwaysTrue = (fragment: SQL): boolean => !params(fragment).some((value) => typeof value === "number" || value instanceof Date)

const retiredOperator = <TOperator extends string>(operators: readonly TOperator[], name: string): TOperator =>
  operators.find((operator) => operator === name)!

const retiredNumericOperator = retiredOperator(NUMERIC_COLUMN_FILTER_OPERATORS, "sometime")

const retiredDateOperator = retiredOperator(DATE_COLUMN_FILTER_OPERATORS, "sometime")

describe("buildAdminNumericFilterSql", () => {
  it.each([
    [NUMERIC_COLUMN_FILTER_OPERATOR.EQ],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GT],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GTE],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LT],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LTE],
  ])("binds the amount for the %s operator", (operator) => {
    expect(params(buildAdminNumericFilterSql(column, { amountMinorUnits: 12_000, operator }))).toContain(12_000)
  })

  it("normalises an inverted between range", () => {
    const fragment = buildAdminNumericFilterSql(column, {
      endAmountMinorUnits: 1000,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits: 50_000,
    })

    expect(params(fragment)).toStrictEqual([1000, 50_000])
  })

  it("matches everything when a between bound is missing", () => {
    const fragment = buildAdminNumericFilterSql(column, {
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits: 1000,
    })

    expect(isAlwaysTrue(fragment)).toBe(true)
  })

  it("keeps every row when the operator is not one it builds SQL for", () => {
    const fragment = buildAdminNumericFilterSql(column, { amountMinorUnits: 12_000, operator: retiredNumericOperator })

    expect(isAlwaysTrue(fragment)).toBe(true)
    expect(params(fragment)).toStrictEqual([])
  })

  it("binds only numbers, which the driver accepts", () => {
    const fragment = buildAdminNumericFilterSql(column, {
      amountMinorUnits: 12_000,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
    })

    expect(params(fragment).every((value) => typeof value === "number")).toBe(true)
  })
})

describe("buildAdminDateFilterSql", () => {
  it.each([[DATE_COLUMN_FILTER_OPERATOR.ON], [DATE_COLUMN_FILTER_OPERATOR.BEFORE], [DATE_COLUMN_FILTER_OPERATOR.AFTER]])(
    "binds epoch milliseconds for the %s operator, the only shape a D1 statement accepts",
    (operator) => {
      const fragment = buildAdminDateFilterSql(column, { date: "2024-06-10", operator })
      const bound = params(fragment)

      expect(bound.length).toBeGreaterThan(0)
      expect(bound.every((value) => typeof value === "number" && Number.isInteger(value))).toBe(true)
    },
  )

  it("binds both range endpoints as epoch milliseconds for the between operator", () => {
    const fragment = buildAdminDateFilterSql(column, {
      endDate: "2024-06-30",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-06-01",
    })

    expect(params(fragment)).toStrictEqual([new Date("2024-06-01T00:00:00.000").getTime(), new Date("2024-06-30T23:59:59.999").getTime()])
  })

  it.each([[DATE_COLUMN_FILTER_OPERATOR.ON], [DATE_COLUMN_FILTER_OPERATOR.BEFORE], [DATE_COLUMN_FILTER_OPERATOR.AFTER]])(
    "matches everything when the %s operator has no date",
    (operator) => {
      expect(isAlwaysTrue(buildAdminDateFilterSql(column, { operator }))).toBe(true)
    },
  )

  it("matches everything when a between endpoint is missing", () => {
    expect(isAlwaysTrue(buildAdminDateFilterSql(column, { operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-01" }))).toBe(
      true,
    )
  })

  it("keeps every row when the operator is not one it builds SQL for", () => {
    const fragment = buildAdminDateFilterSql(column, { date: "2024-06-10", operator: retiredDateOperator })

    expect(isAlwaysTrue(fragment)).toBe(true)
    expect(params(fragment)).toStrictEqual([])
  })

  it("spans the whole selected day for the on operator", () => {
    const fragment = buildAdminDateFilterSql(column, { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON })
    const bounds = params(fragment).filter((value): value is number => typeof value === "number")

    expect(bounds).toHaveLength(2)
    expect((bounds[1] ?? 0) - (bounds[0] ?? 0)).toBe(86_400_000 - 1)
  })
})

describe("normalizeAdminSearchTerm", () => {
  it.each([[undefined], [""], ["   "]])("treats %j as no search", (search) => {
    expect(normalizeAdminSearchTerm(search)).toBeUndefined()
  })

  it("trims a term that carries content", () => {
    expect(normalizeAdminSearchTerm("  silver ring  ")).toBe("silver ring")
  })
})

describe("buildAdminLikePattern", () => {
  it("wraps the term in wildcards", () => {
    expect(buildAdminLikePattern("silver")).toBe("%silver%")
  })

  it("escapes the SQL wildcards with a backslash", () => {
    expect(buildAdminLikePattern("100%")).toBe(String.raw`%100\%%`)
    expect(buildAdminLikePattern("cus_anna")).toBe(String.raw`%cus\_anna%`)
    expect(buildAdminLikePattern(String.raw`a\b`)).toBe(String.raw`%a\\b%`)
  })
})

describe("buildAdminSearchOrCondition", () => {
  it.each([[undefined], ["  "]])("builds no condition for the search %j", (search) => {
    expect(buildAdminSearchOrCondition(search, [column])).toBeUndefined()
  })

  it("builds no condition when there is nothing to search", () => {
    expect(buildAdminSearchOrCondition("silver", [])).toBeUndefined()
  })

  it("lower-cases the pattern so the comparison is case insensitive", () => {
    const condition = buildAdminSearchOrCondition("SILVER", [column])

    expect(condition === undefined ? [] : params(condition)).toContain("%silver%")
  })

  it("declares the escape character so wildcard characters are matched literally", () => {
    const condition = buildAdminSearchOrCondition("cus_anna", [column])
    const rendered = condition === undefined ? "" : renderShape(condition.queryChunks)

    expect(params(condition ?? sql``)).toContain(String.raw`%cus\_anna%`)
    expect(rendered.toLowerCase()).toContain("escape")
  })

  it("searches every supplied column", () => {
    const condition = buildAdminSearchOrCondition("silver", [sql`name`, sql`email`])

    expect(params(condition ?? sql``)).toStrictEqual(["%silver%", "%silver%"])
  })
})

import { type SQL, sql } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { NUMERIC_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATORS } from "~/src/modules/_core/utils/column-filters"
import { buildAdminNumericFilterSql } from "~/src/modules/_core/utils/column-filters.server"
import {
  buildAdminSearchOrCondition,
  containsAdminSearchTerm,
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

describe("normalizeAdminSearchTerm", () => {
  it.each([[undefined], [""], ["   "]])("treats %j as no search", (search) => {
    expect(normalizeAdminSearchTerm(search)).toBeUndefined()
  })

  it("trims a term that carries content", () => {
    expect(normalizeAdminSearchTerm("  silver ring  ")).toBe("silver ring")
  })
})

describe("containsAdminSearchTerm", () => {
  it("looks for the term anywhere in the column's lower-cased text with instr rather than a LIKE pattern", () => {
    const rendered = renderShape(containsAdminSearchTerm(column, "silver").queryChunks).toLowerCase()

    expect(rendered).toContain("instr(lower(cast(")
    expect(rendered).not.toContain("like")
  })

  it.each([["100%"], ["cus_anna"], [String.raw`a\b`], ["anna.kowalska-nowak.zamowienia@przyklad-sklepu-z-bizuteria.pl"]])(
    "binds %s exactly as typed, with nothing escaped or wrapped",
    (term) => {
      expect(params(containsAdminSearchTerm(column, term))).toStrictEqual([term])
    },
  )
})

describe("buildAdminSearchOrCondition", () => {
  it.each([[undefined], ["  "]])("builds no condition for the search %j", (search) => {
    expect(buildAdminSearchOrCondition(search, [column])).toBeUndefined()
  })

  it("builds no condition when there is nothing to search", () => {
    expect(buildAdminSearchOrCondition("silver", [])).toBeUndefined()
  })

  it("lower-cases the term so the comparison is case insensitive", () => {
    const condition = buildAdminSearchOrCondition("SILVER", [column])

    expect(condition === undefined ? [] : params(condition)).toStrictEqual(["silver"])
  })

  it("passes wildcard characters through untouched, since instr matches them literally", () => {
    const condition = buildAdminSearchOrCondition("cus_anna%", [column])

    expect(params(condition ?? sql``)).toStrictEqual(["cus_anna%"])
  })

  it("searches every supplied column", () => {
    const condition = buildAdminSearchOrCondition("silver", [sql`name`, sql`email`])

    expect(params(condition ?? sql``)).toStrictEqual(["silver", "silver"])
  })
})

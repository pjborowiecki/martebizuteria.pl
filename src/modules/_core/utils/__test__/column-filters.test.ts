import { describe, expect, it } from "vite-plus/test"

import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATORS,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  NUMERIC_COLUMN_FILTER_OPERATOR,
  NUMERIC_COLUMN_FILTER_OPERATORS,
  NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL,
  isDateColumnFilterOperator,
  isDateColumnFilterValue,
  isNumericColumnFilterOperator,
  isNumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"

describe("operator vocabularies", () => {
  it("accepts every listed numeric operator and nothing else", () => {
    for (const operator of NUMERIC_COLUMN_FILTER_OPERATORS) {
      expect(isNumericColumnFilterOperator(operator)).toBe(true)
    }

    expect(isNumericColumnFilterOperator("neq")).toBe(false)
  })

  it("accepts every listed date operator and nothing else", () => {
    for (const operator of DATE_COLUMN_FILTER_OPERATORS) {
      expect(isDateColumnFilterOperator(operator)).toBe(true)
    }

    expect(isDateColumnFilterOperator("during")).toBe(false)
  })

  it.each([["toString"], ["constructor"], ["valueOf"], ["hasOwnProperty"]])("rejects the inherited Object key %s as an operator", (key) => {
    expect(isNumericColumnFilterOperator(key)).toBe(false)
    expect(isDateColumnFilterOperator(key)).toBe(false)
    expect(isNumericColumnFilterValue({ amountMinorUnits: 100, operator: key })).toBe(false)
    expect(isDateColumnFilterValue({ date: "2024-03-05", operator: key })).toBe(false)
  })

  it("gives every operator a trigger symbol", () => {
    expect(Object.keys(NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL)).toHaveLength(NUMERIC_COLUMN_FILTER_OPERATORS.length)
    expect(Object.keys(DATE_COLUMN_FILTER_OPERATOR_SYMBOL)).toHaveLength(DATE_COLUMN_FILTER_OPERATORS.length)
  })
})

describe("isNumericColumnFilterValue", () => {
  it.each([[null], [undefined], ["gte"], [42], [{}], [{ amountMinorUnits: 100 }]])("rejects the non-filter value %j", (value) => {
    expect(isNumericColumnFilterValue(value)).toBe(false)
  })

  it("rejects an unknown operator", () => {
    expect(isNumericColumnFilterValue({ amountMinorUnits: 100, operator: "neq" })).toBe(false)
  })

  it("requires a finite single amount for the comparison operators", () => {
    expect(isNumericColumnFilterValue({ amountMinorUnits: 100, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE })).toBe(true)
    expect(isNumericColumnFilterValue({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE })).toBe(false)
    expect(isNumericColumnFilterValue({ amountMinorUnits: "100", operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE })).toBe(false)
    expect(isNumericColumnFilterValue({ amountMinorUnits: Number.NaN, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE })).toBe(false)
  })

  it("requires both bounds for the between operator", () => {
    const operator = NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN

    expect(isNumericColumnFilterValue({ endAmountMinorUnits: 500, operator, startAmountMinorUnits: 100 })).toBe(true)
    expect(isNumericColumnFilterValue({ operator, startAmountMinorUnits: 100 })).toBe(false)
    expect(isNumericColumnFilterValue({ amountMinorUnits: 100, operator })).toBe(false)
  })
})

describe("isDateColumnFilterValue", () => {
  it.each([[null], [undefined], ["on"], [{ date: "2024-03-05" }]])("rejects the non-filter value %j", (value) => {
    expect(isDateColumnFilterValue(value)).toBe(false)
  })

  it("requires a real calendar date for the single-date operators", () => {
    expect(isDateColumnFilterValue({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON })).toBe(true)
    expect(isDateColumnFilterValue({ date: "2024-02-30", operator: DATE_COLUMN_FILTER_OPERATOR.ON })).toBe(false)
    expect(isDateColumnFilterValue({ date: 20_240_305, operator: DATE_COLUMN_FILTER_OPERATOR.ON })).toBe(false)
    expect(isDateColumnFilterValue({ operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })).toBe(false)
  })

  it("requires both endpoints to be real calendar dates for the between operator", () => {
    const operator = DATE_COLUMN_FILTER_OPERATOR.BETWEEN

    expect(isDateColumnFilterValue({ endDate: "2024-03-09", operator, startDate: "2024-03-05" })).toBe(true)
    expect(isDateColumnFilterValue({ endDate: "2024-13-09", operator, startDate: "2024-03-05" })).toBe(false)
    expect(isDateColumnFilterValue({ operator, startDate: "2024-03-05" })).toBe(false)
    expect(isDateColumnFilterValue({ date: "2024-03-05", operator })).toBe(false)
  })
})

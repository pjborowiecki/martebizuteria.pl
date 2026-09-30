import { describe, expect, it } from "vite-plus/test"

import { NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  type NumericFilterFormatContext,
  formatActiveNumericFilterLabel,
  isNumericFilterDraftValid,
  parseNumericFilterDraftValue,
  toNumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.utils"

const money: NumericFilterFormatContext = { currencyCode: "PLN", inputMode: "money", locale: "pl-PL" }

const integer: NumericFilterFormatContext = { currencyCode: "PLN", inputMode: "integer", locale: "pl-PL" }

const draft = (overrides: Partial<Parameters<typeof isNumericFilterDraftValid>[0]> = {}) => ({
  amount: "",
  endAmount: "",
  operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
  startAmount: "",
  ...overrides,
})

describe("toNumericFilterDraft", () => {
  it("starts on the at-least operator with empty fields when nothing is filtered", () => {
    expect(toNumericFilterDraft(undefined, money)).toStrictEqual(draft())
  })

  it("renders a money amount with the locale separator", () => {
    expect(toNumericFilterDraft({ amountMinorUnits: 12_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.LTE }, money)).toStrictEqual(
      draft({ amount: "120,00", operator: NUMERIC_COLUMN_FILTER_OPERATOR.LTE }),
    )
  })

  it("renders an integer amount verbatim", () => {
    expect(toNumericFilterDraft({ amountMinorUnits: 12, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ }, integer)).toStrictEqual(
      draft({ amount: "12", operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ }),
    )
  })

  it("renders both bounds of a between filter", () => {
    expect(
      toNumericFilterDraft(
        { endAmountMinorUnits: 50_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmountMinorUnits: 12_000 },
        money,
      ),
    ).toStrictEqual(draft({ endAmount: "500,00", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "120,00" }))
  })

  it("falls back to zero for a half-built filter", () => {
    expect(toNumericFilterDraft({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.GT }, integer).amount).toBe("0")
    expect(toNumericFilterDraft({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN }, integer)).toMatchObject({
      endAmount: "0",
      startAmount: "0",
    })
  })
})

describe("isNumericFilterDraftValid", () => {
  it("rejects an untouched draft in either mode", () => {
    expect(isNumericFilterDraftValid(draft(), money)).toBe(false)
    expect(isNumericFilterDraftValid(draft(), integer)).toBe(false)
  })

  it("accepts a money amount in the locale notation", () => {
    expect(isNumericFilterDraftValid(draft({ amount: "120,00" }), money)).toBe(true)
    expect(isNumericFilterDraftValid(draft({ amount: "120" }), money)).toBe(true)
  })

  it("rejects a money amount it cannot parse", () => {
    expect(isNumericFilterDraftValid(draft({ amount: "abc" }), money)).toBe(false)
    expect(isNumericFilterDraftValid(draft({ amount: "120,001" }), money)).toBe(false)
  })

  it("accepts a whole number in integer mode", () => {
    expect(isNumericFilterDraftValid(draft({ amount: " 12 " }), integer)).toBe(true)
  })

  it("rejects a negative or non-numeric integer", () => {
    expect(isNumericFilterDraftValid(draft({ amount: "-1" }), integer)).toBe(false)
    expect(isNumericFilterDraftValid(draft({ amount: "abc" }), integer)).toBe(false)
  })

  it("requires both bounds of a between draft", () => {
    const between = { operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN }

    expect(isNumericFilterDraftValid(draft({ ...between, endAmount: "10", startAmount: "1" }), integer)).toBe(true)
    expect(isNumericFilterDraftValid(draft({ ...between, startAmount: "1" }), integer)).toBe(false)
    expect(isNumericFilterDraftValid(draft({ ...between, endAmount: "500,00", startAmount: "120,00" }), money)).toBe(true)
    expect(isNumericFilterDraftValid(draft({ ...between, endAmount: "abc", startAmount: "120,00" }), money)).toBe(false)
  })

  it("defaults to money mode when the caller names none", () => {
    expect(isNumericFilterDraftValid(draft({ amount: "120,00" }), { currencyCode: "PLN", locale: "pl-PL" })).toBe(true)
  })
})

describe("parseNumericFilterDraftValue", () => {
  it("parses a money amount into minor units", () => {
    expect(parseNumericFilterDraftValue(draft({ amount: "120,00" }), money)).toStrictEqual({
      amountMinorUnits: 12_000,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
    })
  })

  it("parses an integer amount as it stands", () => {
    expect(parseNumericFilterDraftValue(draft({ amount: "12" }), integer)).toStrictEqual({
      amountMinorUnits: 12,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
    })
  })

  it("parses both integer range bounds without scaling them as money", () => {
    const between = { endAmount: " 10 ", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "1" }

    expect(parseNumericFilterDraftValue(draft(between), integer)).toStrictEqual({
      endAmountMinorUnits: 10,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits: 1,
    })
  })

  it("parses both bounds of a between draft", () => {
    const between = { endAmount: "500,00", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "120,00" }

    expect(parseNumericFilterDraftValue(draft(between), money)).toStrictEqual({
      endAmountMinorUnits: 50_000,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits: 12_000,
    })
  })

  it("refuses a draft it cannot parse", () => {
    expect(parseNumericFilterDraftValue(draft({ amount: "abc" }), money)).toBeUndefined()
    expect(parseNumericFilterDraftValue(draft({ amount: "-1" }), integer)).toBeUndefined()
    expect(
      parseNumericFilterDraftValue(draft({ endAmount: "", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "1" }), integer),
    ).toBeUndefined()
    expect(
      parseNumericFilterDraftValue(
        draft({ endAmount: "abc", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "120,00" }),
        money,
      ),
    ).toBeUndefined()
  })

  it("round trips through the draft renderer", () => {
    const value = { amountMinorUnits: 12_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.LT }

    expect(parseNumericFilterDraftValue(toNumericFilterDraft(value, money), money)).toStrictEqual(value)
  })
})

describe("formatActiveNumericFilterLabel", () => {
  it("prefixes a single amount with its operator symbol", () => {
    expect(formatActiveNumericFilterLabel({ amountMinorUnits: 12_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE }, money)).toBe(
      "≥ 120,00",
    )
  })

  it("renders a range between both bounds", () => {
    expect(
      formatActiveNumericFilterLabel(
        { endAmountMinorUnits: 50_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmountMinorUnits: 12_000 },
        money,
      ),
    ).toBe("↔ 120,00 – 500,00")
  })

  it("renders integer mode without a currency separator", () => {
    expect(formatActiveNumericFilterLabel({ amountMinorUnits: 12, operator: NUMERIC_COLUMN_FILTER_OPERATOR.LTE }, integer)).toBe("≤ 12")
  })

  it("falls back to zero for a half-built filter", () => {
    expect(formatActiveNumericFilterLabel({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ }, integer)).toBe("= 0")
    expect(formatActiveNumericFilterLabel({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN }, integer)).toBe("↔ 0 – 0")
  })
})

describe("integer numeric filter input", () => {
  it.each(["1.5", "12abc", "1e2", "0x10", "9007199254740992", "-1", "", "   "])(
    "rejects %j instead of truncating or rounding it",
    (amount) => {
      expect(isNumericFilterDraftValid(draft({ amount }), integer)).toBe(false)
      expect(parseNumericFilterDraftValue(draft({ amount }), integer)).toBeUndefined()
    },
  )

  it.each(["0", "00012", " 12 "])("accepts the whole decimal number %j", (amount) => {
    expect(isNumericFilterDraftValid(draft({ amount }), integer)).toBe(true)
    expect(parseNumericFilterDraftValue(draft({ amount }), integer)).toStrictEqual({
      amountMinorUnits: Number(amount),
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
    })
  })

  it.each([
    { endAmount: "10", startAmount: "1.5" },
    { endAmount: "10x", startAmount: "1" },
  ])("rejects a range with malformed bounds $startAmount to $endAmount", (bounds) => {
    const range = draft({ ...bounds, operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN })

    expect(isNumericFilterDraftValid(range, integer)).toBe(false)
    expect(parseNumericFilterDraftValue(range, integer)).toBeUndefined()
  })
})

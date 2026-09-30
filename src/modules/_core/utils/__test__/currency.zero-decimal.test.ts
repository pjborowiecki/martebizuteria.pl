import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const { ZERO_DECIMAL_CODE, stripeMinimum } = vi.hoisted(() => {
  const minimums: Record<string, number> = { JPY: 50 }

  return { ZERO_DECIMAL_CODE: "JPY", stripeMinimum: minimums }
})

vi.mock("~/src/modules/_core/constants/currency", () => ({
  STORE_CURRENCY_CODE: ZERO_DECIMAL_CODE,
  STRIPE_MIN_MAJOR_UNITS: stripeMinimum,
  SUPPORTED_CURRENCY_CODES: [ZERO_DECIMAL_CODE],
  getCurrencyExponent: () => 0,
  isSupportedCurrencyCode: (value: string) => value === ZERO_DECIMAL_CODE,
}))

import {
  getExampleMajorAmount,
  getMinPriceMinorUnits,
  getMoneyInputStep,
  isCompleteMoneyInput,
  isPartialMoneyInput,
  minorUnitsPerMajor,
  parseMoneyInputToMinorUnits,
} from "~/src/modules/_core/utils/currency"

describe("a currency with no minor unit", () => {
  it("steps whole units rather than fractions", () => {
    expect(getMoneyInputStep(ZERO_DECIMAL_CODE)).toBe("1")
  })

  it("treats one major unit as one minor unit", () => {
    expect(minorUnitsPerMajor(ZERO_DECIMAL_CODE)).toBe(1)
  })

  it("takes the Stripe minimum as the minimum price without scaling it", () => {
    expect(getMinPriceMinorUnits(ZERO_DECIMAL_CODE)).toBe(50)
  })

  it("suggests the usual example amount when the Stripe minimum is a whole unit or more", () => {
    expect(getExampleMajorAmount(ZERO_DECIMAL_CODE)).toBe(199)
  })
})

describe("typing an amount in a currency with no minor unit", () => {
  it.each(["", "1", "1200"])("accepts %j while the shopper is still typing", (input) => {
    expect(isPartialMoneyInput(input, ZERO_DECIMAL_CODE)).toBe(true)
  })

  it.each(["1.", "1.5", "1,5"])("refuses %j, since the currency has no fractional part", (input) => {
    expect(isPartialMoneyInput(input, ZERO_DECIMAL_CODE)).toBe(false)
  })

  it.each(["1", "1200"])("treats %j as a complete amount", (input) => {
    expect(isCompleteMoneyInput(input, ZERO_DECIMAL_CODE)).toBe(true)
  })

  it.each(["", "1.5"])("treats %j as incomplete", (input) => {
    expect(isCompleteMoneyInput(input, ZERO_DECIMAL_CODE)).toBe(false)
  })

  it("parses a whole amount straight into minor units", () => {
    expect(parseMoneyInputToMinorUnits("1200", ZERO_DECIMAL_CODE)).toBe(1200)
  })
})

describe("a currency whose Stripe minimum is below one major unit", () => {
  afterEach(() => {
    stripeMinimum[ZERO_DECIMAL_CODE] = 50
  })

  it("raises the example amount to a whole major unit", () => {
    stripeMinimum[ZERO_DECIMAL_CODE] = 0.5

    expect(getExampleMajorAmount(ZERO_DECIMAL_CODE)).toBe(1)
  })
})

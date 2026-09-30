import { describe, expect, it, vi } from "vite-plus/test"

import type * as CurrencyConstants from "~/src/modules/_core/constants/currency"

vi.mock("~/src/modules/_core/constants/currency", async (importOriginal) => {
  const actual = await importOriginal<typeof CurrencyConstants>()
  const supportedCurrencies = new Set(["JPY", "KWD"])

  return {
    ...actual,
    STORE_CURRENCY_CODE: "JPY",
    STRIPE_MIN_MAJOR_UNITS: { JPY: 50, KWD: 0.15 },
    SUPPORTED_CURRENCY_CODES: [...supportedCurrencies],
    isSupportedCurrencyCode: (value: string) => supportedCurrencies.has(value),
  }
})

import {
  MIN_PRICE_CENTS,
  formatMinorUnitsToMoneyInput,
  formatMinorUnitsToNumberInput,
  formatPrice,
  getCurrencyDefinition,
  getExampleMajorAmount,
  getMinPriceMinorUnits,
  getMoneyInputStep,
  isCompleteMoneyInput,
  isPartialMoneyInput,
  minorUnitsPerMajor,
  parseMoneyInputToMinorUnits,
  resolveCurrencyCode,
  toNumberMoneyInputValue,
} from "~/src/modules/_core/utils/currency"

describe("a store configured for a currency without fractional units", () => {
  it("derives scale, minimum, and input step from the configured currency", () => {
    expect(resolveCurrencyCode()).toBe("JPY")
    expect(getCurrencyDefinition("JPY")).toStrictEqual({ code: "JPY", minorUnitExponent: 0, stripeMinMajorUnits: 50 })
    expect(minorUnitsPerMajor("JPY")).toBe(1)
    expect(getMinPriceMinorUnits()).toBe(50)
    expect(MIN_PRICE_CENTS).toBe(50)
    expect(getMoneyInputStep()).toBe("1")
  })

  it.each(["", "0", "199"])("accepts the partial whole-number input %j", (value) => {
    expect(isPartialMoneyInput(value, "JPY")).toBe(true)
  })

  it.each(["199.0", "199,0", "199.", ".", "-1"])("rejects fractional or signed input %j", (value) => {
    expect(isPartialMoneyInput(value, "JPY")).toBe(false)
    expect(isCompleteMoneyInput(value, "JPY")).toBe(false)
    expect(parseMoneyInputToMinorUnits(value, "JPY")).toBeUndefined()
  })

  it("parses whole amounts without applying a cent multiplier", () => {
    expect(isCompleteMoneyInput("199", "JPY")).toBe(true)
    expect(parseMoneyInputToMinorUnits("199", "JPY")).toBe(199)
    expect(parseMoneyInputToMinorUnits("0007", "JPY")).toBe(7)
  })

  it("formats whole amounts without adding decimal places", () => {
    expect(formatMinorUnitsToNumberInput(199, "JPY")).toBe("199")
    expect(formatMinorUnitsToMoneyInput(199, "JPY", "en-US")).toBe("199")
    expect(toNumberMoneyInputValue("199", "JPY")).toBe("199")
    expect(formatPrice(199, "JPY", "en-US")).toBe("¥199")
  })
})

describe("a configured currency with three fractional digits", () => {
  it("preserves all three minor digits while deriving the provider floor", () => {
    expect(minorUnitsPerMajor("KWD")).toBe(1000)
    expect(getMoneyInputStep("KWD")).toBe("0.001")
    expect(getMinPriceMinorUnits("KWD")).toBe(150)
    expect(parseMoneyInputToMinorUnits("1.005", "KWD")).toBe(1005)
    expect(formatMinorUnitsToNumberInput(1005, "KWD")).toBe("1.005")
  })

  it("uses a whole example amount when the provider floor is below one", () => {
    expect(getExampleMajorAmount("KWD")).toBe(1)
  })

  it("formats another supported currency using that currency's minor unit scale", () => {
    expect(formatPrice(1005, "kwd", "en-US")).toBe("KWD 1.005")
  })
})

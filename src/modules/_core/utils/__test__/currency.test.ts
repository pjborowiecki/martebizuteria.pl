import { describe, expect, it, vi } from "vite-plus/test"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  MIN_PRICE_CENTS,
  centsToDisplayAmount,
  formatCentsToMoneyInput,
  formatMinorUnits,
  formatMinorUnitsAsDecimal,
  formatMinorUnitsToMoneyInput,
  formatMinorUnitsToNumberInput,
  formatPrice,
  getCurrencyDefinition,
  getExampleMajorAmount,
  getLocaleDecimalSeparator,
  getMinPriceMinorUnits,
  getMoneyInputStep,
  isCompareAtValid,
  isCompleteMoneyInput,
  isPartialMoneyInput,
  isSellPriceCentsValid,
  minorUnitsPerMajor,
  normalizeCurrencyCode,
  parseMoneyInputToCents,
  parseMoneyInputToMinorUnits,
  resolveCurrencyCode,
  toNumberMoneyInputValue,
} from "~/src/modules/_core/utils/currency"

describe("currency code resolution", () => {
  it("normalizes case and surrounding whitespace for supported codes", () => {
    expect(normalizeCurrencyCode("  pln ")).toBe("PLN")
  })

  it("reports unsupported codes as undefined instead of guessing", () => {
    expect(normalizeCurrencyCode("USD")).toBeUndefined()
    expect(normalizeCurrencyCode("")).toBeUndefined()
  })

  it("falls back to the store currency when no code is supplied", () => {
    expect(resolveCurrencyCode()).toBe(STORE_CURRENCY_CODE)
  })

  it("refuses to price in a currency the store does not support", () => {
    expect(() => resolveCurrencyCode("USD")).toThrow("Unsupported currency code: USD")
  })

  it("exposes the ISO exponent and the Stripe floor together", () => {
    expect(getCurrencyDefinition("pln")).toStrictEqual({ code: "PLN", minorUnitExponent: 2, stripeMinMajorUnits: 2 })
  })
})

describe("minor unit arithmetic", () => {
  it("derives the minor unit scale from the ISO exponent", () => {
    expect(minorUnitsPerMajor("PLN")).toBe(100)
  })

  it("keeps the published minimum in sync with the Stripe floor", () => {
    expect(getMinPriceMinorUnits()).toBe(200)
    expect(MIN_PRICE_CENTS).toBe(200)
  })

  it("rejects prices under the payment provider minimum", () => {
    expect(isSellPriceCentsValid(MIN_PRICE_CENTS)).toBe(true)
    expect(isSellPriceCentsValid(MIN_PRICE_CENTS - 1)).toBe(false)
  })

  it("steps money inputs by one minor unit", () => {
    expect(getMoneyInputStep()).toBe("0.01")
  })

  it("uses a realistic example amount above the provider floor", () => {
    expect(getExampleMajorAmount()).toBe(199)
  })

  it("converts minor units to a display amount", () => {
    expect(centsToDisplayAmount(1250)).toBe(12.5)
  })
})

describe("locale separators", () => {
  it("uses a dot when the number formatter does not supply a decimal part", () => {
    const formatToParts = vi.spyOn(Intl.NumberFormat.prototype, "formatToParts").mockReturnValue([{ type: "integer", value: "199" }])

    try {
      expect(getLocaleDecimalSeparator("en-US")).toBe(".")
    } finally {
      formatToParts.mockRestore()
    }
  })

  it.each([
    ["pl-PL", ","],
    ["en-US", "."],
    ["de-DE", ","],
  ])("detects the %s decimal separator", (locale, expected) => {
    expect(getLocaleDecimalSeparator(locale)).toBe(expected)
  })
})

describe("partial money input", () => {
  it("accepts a value the shopper is still typing", () => {
    expect(isPartialMoneyInput("", "PLN")).toBe(true)
    expect(isPartialMoneyInput("12", "PLN")).toBe(true)
    expect(isPartialMoneyInput("12.", "PLN")).toBe(true)
    expect(isPartialMoneyInput("12.5", "PLN")).toBe(true)
  })

  it("stops at the currency's minor unit precision", () => {
    expect(isPartialMoneyInput("12.345", "PLN")).toBe(false)
  })

  it("accepts the locale separator and ignores spacing", () => {
    expect(isPartialMoneyInput(" 12, ", "PLN", "pl-PL")).toBe(true)
  })

  it("rejects grouped input that mixes both separators", () => {
    expect(isPartialMoneyInput("1.234,56", "PLN", "pl-PL")).toBe(false)
    expect(isPartialMoneyInput("1,234.56", "PLN", "en-US")).toBe(false)
  })
})

describe("complete money input", () => {
  it("requires at least one digit", () => {
    expect(isCompleteMoneyInput("", "PLN")).toBe(false)
    expect(isCompleteMoneyInput("   ", "PLN")).toBe(false)
  })

  it("accepts whole and fractional amounts", () => {
    expect(isCompleteMoneyInput("12", "PLN")).toBe(true)
    expect(isCompleteMoneyInput("12.5", "PLN")).toBe(true)
    expect(isCompleteMoneyInput("12,50", "PLN", "pl-PL")).toBe(true)
  })

  it("refuses a trailing separator in either notation", () => {
    expect(isCompleteMoneyInput("12.", "PLN")).toBe(false)
    expect(isCompleteMoneyInput("12,", "PLN", "pl-PL")).toBe(false)
    expect(isCompleteMoneyInput("12.", "PLN", "pl-PL")).toBe(false)
  })

  it("refuses mixed separators and non numeric text", () => {
    expect(isCompleteMoneyInput("1.234,56", "PLN", "pl-PL")).toBe(false)
    expect(isCompleteMoneyInput("abc", "PLN")).toBe(false)
  })
})

describe("parsing money input to minor units", () => {
  it("treats an empty field as zero rather than invalid", () => {
    expect(parseMoneyInputToMinorUnits("", "PLN")).toBe(0)
    expect(parseMoneyInputToMinorUnits("  ", "PLN")).toBe(0)
  })

  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.05", 1205],
    ["0.99", 99],
  ])("parses %s to %i minor units", (input, expected) => {
    expect(parseMoneyInputToMinorUnits(input, "PLN")).toBe(expected)
  })

  it("parses the locale separator", () => {
    expect(parseMoneyInputToMinorUnits("12,50", "PLN", "pl-PL")).toBe(1250)
  })

  it("returns undefined for values it cannot trust", () => {
    expect(parseMoneyInputToMinorUnits("12.345", "PLN")).toBeUndefined()
    expect(parseMoneyInputToMinorUnits("abc", "PLN")).toBeUndefined()
    expect(parseMoneyInputToMinorUnits("1.234,56", "PLN", "pl-PL")).toBeUndefined()
  })

  it("defaults to zero cents when the store-currency helper cannot parse", () => {
    expect(parseMoneyInputToCents("12.50")).toBe(1250)
    expect(parseMoneyInputToCents("nonsense")).toBe(0)
  })
})

describe("formatting minor units", () => {
  it("renders a plain numeric input value at full precision", () => {
    expect(formatMinorUnitsToNumberInput(1250, "PLN")).toBe("12.50")
    expect(formatMinorUnitsToNumberInput(5, "PLN")).toBe("0.05")
  })

  it("renders the locale separator without grouping for text inputs", () => {
    expect(formatMinorUnitsToMoneyInput(123_456, "PLN", "pl-PL")).toBe("1234,56")
    expect(formatMinorUnitsToMoneyInput(123_456, "PLN", "en-US")).toBe("1234.56")
  })

  it("groups thousands when asked", () => {
    expect(formatMinorUnitsAsDecimal(123_456, { currencyCode: "PLN", locale: "en-US", useGrouping: true })).toBe("1,234.56")
  })

  it("renders a currency-styled amount", () => {
    const formatted = formatMinorUnits(1250, "PLN", "pl-PL")
    expect(formatted).toContain("12,50")
    expect(formatted).toContain("zł")
  })

  it("routes the store currency through the shared formatter regardless of case", () => {
    expect(formatPrice(1250, "pln", "pl-PL")).toBe(formatMinorUnits(1250, "PLN", "pl-PL"))
  })

  it("cannot format a currency the store does not support", () => {
    expect(() => formatPrice(1250, "USD", "en-US")).toThrow("Unsupported currency code: USD")
  })

  it("formats cents for the store currency with and without a locale", () => {
    expect(formatCentsToMoneyInput(1250)).toBe("12.50")
    expect(formatCentsToMoneyInput(1250, "pl-PL")).toBe("12,50")
  })
})

describe("compare-at validation", () => {
  it("treats a blank compare-at price as absent", () => {
    expect(isCompareAtValid(1000, "  ")).toBe(true)
  })

  it("requires the compare-at price to be at least the sell price", () => {
    expect(isCompareAtValid(1000, "10.00")).toBe(true)
    expect(isCompareAtValid(1000, "12.00")).toBe(true)
    expect(isCompareAtValid(1000, "9.99")).toBe(false)
  })

  it("rejects an unparseable compare-at price", () => {
    expect(isCompareAtValid(1000, "abc")).toBe(false)
  })
})

describe("coercing a typed value into a money input", () => {
  it("leaves an empty field empty", () => {
    expect(toNumberMoneyInputValue("", "PLN")).toBe("")
  })

  it("discards input that contains no usable digits", () => {
    expect(toNumberMoneyInputValue("abc", "PLN")).toBe("")
  })

  it("pads a partially typed amount to full precision", () => {
    expect(toNumberMoneyInputValue("12.5", "PLN")).toBe("12.50")
  })

  it("keeps the locale separator when a locale is supplied", () => {
    expect(toNumberMoneyInputValue("12,5", "PLN", "pl-PL")).toBe("12,50")
  })

  it("drops characters typed past the minor unit precision", () => {
    expect(toNumberMoneyInputValue("12.599", "PLN")).toBe("12.59")
  })

  it("strips trailing letters instead of rejecting the whole value", () => {
    expect(toNumberMoneyInputValue("12zl", "PLN")).toBe("12.00")
  })

  it("leaves a separator the shopper has only just typed in place", () => {
    expect(toNumberMoneyInputValue("12.", "PLN")).toBe("12.")
  })

  it("leaves the locale separator in place until a minor digit follows it", () => {
    expect(toNumberMoneyInputValue("12,", "PLN", "pl-PL")).toBe("12,")
  })
})

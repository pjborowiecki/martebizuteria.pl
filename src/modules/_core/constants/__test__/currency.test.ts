import { expect, it } from "vite-plus/test"

import { getCurrencyExponent, isSupportedCurrencyCode } from "~/src/modules/_core/constants/currency"

it.each([
  ["PLN", 2],
  [" jpy ", 0],
  ["KWD", 3],
  ["unrecognized", 2],
])("resolves %s to its ISO exponent or the unknown-code fallback", (code, exponent) => {
  expect(getCurrencyExponent(code)).toBe(exponent)
})

it("recognizes only the configured store currency as supported", () => {
  expect(isSupportedCurrencyCode("PLN")).toBe(true)
  expect(isSupportedCurrencyCode("JPY")).toBe(false)
  expect(isSupportedCurrencyCode("pln")).toBe(false)
})

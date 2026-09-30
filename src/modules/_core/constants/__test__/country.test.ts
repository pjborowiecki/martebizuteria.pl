import { describe, expect, it } from "vite-plus/test"

import { COUNTRIES } from "~/src/modules/_core/constants/country"
import { CURRENCIES } from "~/src/modules/_core/constants/currency"

describe("COUNTRIES", () => {
  it("gives every country a unique alpha-2 code", () => {
    const codes = COUNTRIES.map((country) => country.alpha2)

    expect(new Set(codes).size).toBe(codes.length)
  })

  it("gives every country a unique alpha-3 code", () => {
    const codes = COUNTRIES.map((country) => country.alpha3)

    expect(new Set(codes).size).toBe(codes.length)
  })

  it("gives every country a unique numeric code", () => {
    const codes = COUNTRIES.map((country) => country.numeric)

    expect(new Set(codes).size).toBe(codes.length)
  })

  it("uses two uppercase letters for alpha-2 codes", () => {
    for (const country of COUNTRIES) {
      expect(country.alpha2).toMatch(/^[A-Z]{2}$/u)
    }
  })

  it("uses three uppercase letters for alpha-3 codes", () => {
    for (const country of COUNTRIES) {
      expect(country.alpha3).toMatch(/^[A-Z]{3}$/u)
    }
  })

  it("uses three zero padded digits for numeric codes", () => {
    for (const country of COUNTRIES) {
      expect(country.numeric).toMatch(/^\d{3}$/u)
    }
  })

  it("points every country at a currency the currency table knows", () => {
    for (const country of COUNTRIES) {
      expect(Object.keys(CURRENCIES)).toContain(country.currency)
    }
  })

  it("stays sorted by alpha-2 code", () => {
    const codes = COUNTRIES.map((country) => country.alpha2)

    expect(codes).toStrictEqual(codes.toSorted())
  })

  it("keeps the store home market and its currency", () => {
    expect(COUNTRIES).toContainEqual({ alpha2: "PL", alpha3: "POL", currency: "PLN", numeric: "616" })
  })
})

import { describe, expect, it } from "vite-plus/test"

import { MIN_PRICE_CENTS } from "~/src/modules/_core/utils/currency"
import { getCartLineTotalCents, getCartLineUnitPriceCents } from "~/src/modules/cart/cart.pricing"

describe("getCartLineUnitPriceCents", () => {
  it("trusts a stored minor-unit price at or above the payment floor", () => {
    expect(getCartLineUnitPriceCents({ price: "99.00", rawPrice: 1250 })).toBe(1250)
    expect(getCartLineUnitPriceCents({ price: "99.00", rawPrice: MIN_PRICE_CENTS })).toBe(MIN_PRICE_CENTS)
  })

  it("re-parses the display string when the stored price is below the payment floor", () => {
    expect(getCartLineUnitPriceCents({ price: "12.50", rawPrice: MIN_PRICE_CENTS - 1 })).toBe(1250)
    expect(getCartLineUnitPriceCents({ price: "12.50", rawPrice: 0 })).toBe(1250)
  })

  it("re-parses the display string when the stored price is not a finite number", () => {
    expect(getCartLineUnitPriceCents({ price: "12.50", rawPrice: Number.NaN })).toBe(1250)
    expect(getCartLineUnitPriceCents({ price: "12.50", rawPrice: Number.POSITIVE_INFINITY })).toBe(1250)
  })

  it("falls back to zero rather than a wrong charge when neither source parses", () => {
    expect(getCartLineUnitPriceCents({ price: "not a price", rawPrice: 0 })).toBe(0)
  })
})

describe("getCartLineTotalCents", () => {
  it("multiplies the resolved unit price by the quantity", () => {
    expect(getCartLineTotalCents({ price: "12.50", qty: 3, rawPrice: 1250 })).toBe(3750)
  })

  it("returns zero for a zero quantity line", () => {
    expect(getCartLineTotalCents({ price: "12.50", qty: 0, rawPrice: 1250 })).toBe(0)
  })

  it("uses the re-parsed price when the stored one is untrustworthy", () => {
    expect(getCartLineTotalCents({ price: "12.50", qty: 2, rawPrice: 1 })).toBe(2500)
  })
})

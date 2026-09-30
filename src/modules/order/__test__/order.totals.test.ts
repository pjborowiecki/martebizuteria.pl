import { describe, expect, it } from "vite-plus/test"

import { netFromGross, vatFromGross } from "~/src/modules/_core/utils/tax"
import { computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"

describe("sumOrderLineSubtotal", () => {
  it("multiplies each line out before summing", () => {
    expect(
      sumOrderLineSubtotal([
        { price: 10_000, qty: 2 },
        { price: 2500, qty: 3 },
      ]),
    ).toBe(27_500)
  })

  it("sums an empty basket to nothing", () => {
    expect(sumOrderLineSubtotal([])).toBe(0)
  })
})

describe("vatFromGross", () => {
  it("carves 23% out of a gross amount rather than adding it on", () => {
    expect(vatFromGross(12_300)).toBe(2300)
    expect(netFromGross(12_300)).toBe(10_000)
  })

  it("keeps net and VAT adding back up to the gross amount", () => {
    for (const gross of [1, 99, 1999, 21_500, 64_600, 1_000_003]) {
      expect(netFromGross(gross) + vatFromGross(gross)).toBe(gross)
    }
  })

  it("charges no VAT on nothing", () => {
    expect(vatFromGross(0)).toBe(0)
  })
})

describe("computeOrderTotals", () => {
  it("adds shipping to the item subtotal and derives VAT from the payable total", () => {
    expect(computeOrderTotals({ itemsSubtotal: 20_000, shippingTotal: 1500 })).toStrictEqual({
      discountTotal: 0,
      shippingTotal: 1500,
      subtotal: 20_000,
      taxTotal: 4020,
      total: 21_500,
      vatBasisPoints: 2300,
    })
  })

  it("takes the discount off the payable total and off the VAT with it", () => {
    const withoutDiscount = computeOrderTotals({ itemsSubtotal: 20_000, shippingTotal: 1500 })
    const withDiscount = computeOrderTotals({ discountTotal: 5000, itemsSubtotal: 20_000, shippingTotal: 1500 })

    expect(withDiscount.total).toBe(16_500)
    expect(withDiscount.taxTotal).toBeLessThan(withoutDiscount.taxTotal)
    expect(withDiscount.subtotal).toBe(20_000)
  })

  it("never lets a discount push the payable total below zero", () => {
    expect(computeOrderTotals({ discountTotal: 99_999, itemsSubtotal: 20_000, shippingTotal: 1500 })).toMatchObject({
      discountTotal: 21_500,
      taxTotal: 0,
      total: 0,
    })
  })

  it("ignores a negative discount rather than inflating the total", () => {
    expect(computeOrderTotals({ discountTotal: -5000, itemsSubtotal: 20_000, shippingTotal: 0 })).toMatchObject({
      discountTotal: 0,
      total: 20_000,
    })
  })

  it("honours an explicit VAT rate", () => {
    expect(computeOrderTotals({ itemsSubtotal: 10_800, shippingTotal: 0, vatBasisPoints: 800 })).toMatchObject({
      taxTotal: 800,
      vatBasisPoints: 800,
    })
  })
})

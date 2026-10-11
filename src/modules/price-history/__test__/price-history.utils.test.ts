import { describe, expect, it } from "vite-plus/test"

import { attachPriceReductions, findPriceReduction, isPriceReduced } from "~/src/modules/price-history/price-history.utils"

const REDUCED_AT = new Date("2026-10-01T00:00:00.000Z")

describe("isPriceReduced", () => {
  it.each([
    [{ compareAtPrice: 30_000, price: 20_000 }, true],
    [{ compareAtPrice: 20_000, price: 20_000 }, false],
    [{ compareAtPrice: null, price: 20_000 }, false],
  ])("tells whether %o sells below its compare-at price", (priced, reduced) => {
    expect(isPriceReduced(priced)).toBe(reduced)
  })
})

describe("findPriceReduction", () => {
  it("finds nothing for a variant with no recorded price", () => {
    expect(findPriceReduction(20_000, [])).toBeUndefined()
  })

  it("finds no reduction for a variant first offered at its reduced price, because it never cost more", () => {
    expect(findPriceReduction(20_000, [{ changedAt: REDUCED_AT, compareAtPrice: 30_000, price: 20_000 }])).toBeUndefined()
  })
})

describe("attachPriceReductions", () => {
  it("gives each variant of a product its own reduction and leaves the rest of the product as it was", () => {
    const reduction = { lowestPrice: 28_000 }

    expect(
      attachPriceReductions(
        {
          handle: "silver-ring",
          variants: [
            { id: "variant-s", price: 20_000 },
            { id: "variant-l", price: 26_000 },
          ],
        },
        new Map([["variant-s", reduction]]),
      ),
    ).toStrictEqual({
      handle: "silver-ring",
      variants: [
        { id: "variant-s", price: 20_000, priceReduction: reduction },
        { id: "variant-l", price: 26_000, priceReduction: undefined },
      ],
    })
  })
})

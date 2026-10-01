import { describe, expect, it } from "vite-plus/test"

import { buildStorefrontSearchExpression, foldStorefrontSearchText } from "~/src/modules/storefront-search/storefront-search.utils"

describe("foldStorefrontSearchText", () => {
  it("folds only the stroked l, leaving the decomposable diacritics to the tokenizer", () => {
    expect(foldStorefrontSearchText("Złoty łańcuszek, Łódź")).toBe("Zloty lańcuszek, Lódź")
  })
})

describe("buildStorefrontSearchExpression", () => {
  it("turns each word into a quoted prefix query", () => {
    expect(buildStorefrontSearchExpression("złoty pierścionek")).toBe('"zloty"* "pierścionek"*')
  })

  it("splits on punctuation so a hyphenated or quoted term cannot break the query", () => {
    expect(buildStorefrontSearchExpression('vintage-style "onyx"')).toBe('"vintage"* "style"* "onyx"*')
  })

  it("keeps bare operators as words rather than operators", () => {
    expect(buildStorefrontSearchExpression("silver AND gold")).toBe('"silver"* "AND"* "gold"*')
  })

  it("keeps numbers so a customer can search for 925 or 585", () => {
    expect(buildStorefrontSearchExpression("srebro 925")).toBe('"srebro"* "925"*')
  })

  it.each(["", "   ", "!!!", "- -"])("has nothing to match for %j", (term) => {
    expect(buildStorefrontSearchExpression(term)).toBeUndefined()
  })
})

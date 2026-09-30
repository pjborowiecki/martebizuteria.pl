import { describe, expect, it } from "vite-plus/test"

import { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"

describe("normalizeSlugInput", () => {
  it("lowercases and joins words with a single hyphen", () => {
    expect(normalizeSlugInput("Silver Ring Set")).toBe("silver-ring-set")
  })

  it("maps the stroked l before stripping diacritics", () => {
    expect(normalizeSlugInput("Złoty Łańcuszek")).toBe("zloty-lancuszek")
  })

  it("strips combining diacritics from Polish letters", () => {
    expect(normalizeSlugInput("Pierścionek zaręczynowy ćma")).toBe("pierscionek-zareczynowy-cma")
  })

  it("collapses runs of separators into one hyphen", () => {
    expect(normalizeSlugInput("gold   ///  chain")).toBe("gold-chain")
    expect(normalizeSlugInput("gold---chain")).toBe("gold-chain")
  })

  it("drops leading separators but keeps a trailing one while typing", () => {
    expect(normalizeSlugInput("---gold")).toBe("gold")
    expect(normalizeSlugInput("gold ")).toBe("gold-")
  })

  it("keeps digits and existing hyphens", () => {
    expect(normalizeSlugInput("srebro-925")).toBe("srebro-925")
  })

  it("reduces a value made only of separators to an empty string", () => {
    expect(normalizeSlugInput("  ///  ")).toBe("")
  })
})

describe("slugify", () => {
  it("trims the input so no trailing hyphen survives", () => {
    expect(slugify("  Gold Chain  ")).toBe("gold-chain")
  })

  it("removes trailing hyphens the user typed inside the value", () => {
    expect(slugify("Gold Chain---")).toBe("gold-chain")
  })

  it("differs from normalizeSlugInput exactly at the trailing separator", () => {
    expect(normalizeSlugInput("gold chain ")).toBe("gold-chain-")
    expect(slugify("gold chain ")).toBe("gold-chain")
  })

  it("returns an empty slug when nothing usable remains", () => {
    expect(slugify("   ---   ")).toBe("")
  })
})

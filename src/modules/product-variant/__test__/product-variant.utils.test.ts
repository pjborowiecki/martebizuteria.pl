import { describe, expect, it } from "vite-plus/test"

import {
  DEFAULT_VARIANT_TITLE,
  MAX_PRODUCT_OPTIONS,
  type ProductOptionDraft,
  VARIANT_TITLE_SEPARATOR,
  buildVariantCombinationKey,
  buildVariantCombinations,
  buildVariantCombinationsFromFormDrafts,
  buildVariantDisplayTitle,
  buildVariantTitle,
  inferHasVariants,
  normalizeOptionDrafts,
  resolveVariantOptionValueIds,
} from "~/src/modules/product-variant/product-variant.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const option = (title: string, values: readonly { id?: string; pl: string; en?: string }[], id?: string): ProductOptionDraft => ({
  ...(id === undefined ? {} : { id }),
  titles: locales(title),
  values: values.map((value) => ({ ...(value.id === undefined ? {} : { id: value.id }), labels: locales(value.pl, value.en ?? value.pl) })),
})

describe("buildVariantTitle", () => {
  it("joins the option value keys in insertion order", () => {
    expect(buildVariantTitle({ color: "silver", size: "S" })).toBe(`silver${VARIANT_TITLE_SEPARATOR}S`)
  })

  it("skips blank keys", () => {
    expect(buildVariantTitle({ color: "  ", size: "S" })).toBe("S")
  })

  it("falls back to the default title for a product with no options", () => {
    expect(buildVariantTitle({})).toBe(DEFAULT_VARIANT_TITLE)
    expect(buildVariantTitle({ color: "   " })).toBe(DEFAULT_VARIANT_TITLE)
  })
})

describe("buildVariantDisplayTitle", () => {
  const options = [option("Rozmiar", [{ en: "Small", id: "value-s", pl: "Mały" }], "option-size")]

  it("resolves persisted value ids to their localized labels", () => {
    expect(buildVariantDisplayTitle({ "option-size": "value-s" }, options, "en-US")).toBe("Small")
    expect(buildVariantDisplayTitle({ "option-size": "value-s" }, options, "pl-PL")).toBe("Mały")
  })

  it("shows an unknown value key rather than dropping the variant's identity", () => {
    expect(buildVariantDisplayTitle({ "option-size": "value-xl" }, options, "pl-PL")).toBe("value-xl")
  })

  it("falls back to the default title when nothing resolves to a label", () => {
    expect(buildVariantDisplayTitle({}, options, "pl-PL")).toBe(DEFAULT_VARIANT_TITLE)
  })
})

describe("buildVariantCombinationKey", () => {
  it("is stable regardless of the order the options were entered in", () => {
    expect(buildVariantCombinationKey({ color: "silver", size: "S" })).toBe(buildVariantCombinationKey({ color: "silver", size: "S" }))
  })

  it("distinguishes different value assignments", () => {
    expect(buildVariantCombinationKey({ size: "S" })).not.toBe(buildVariantCombinationKey({ size: "M" }))
  })

  it("is empty for a product with no options", () => {
    expect(buildVariantCombinationKey({})).toBe("")
  })
})

describe("buildVariantCombinations", () => {
  it("produces one default combination when there are no usable options", () => {
    expect(buildVariantCombinations([])).toStrictEqual([{ optionValues: {}, title: DEFAULT_VARIANT_TITLE }])
  })

  it("keys single-option combinations by the default locale label when no id is persisted", () => {
    expect(buildVariantCombinations([option("Rozmiar", [{ pl: "Mały" }, { pl: "Duży" }])])).toStrictEqual([
      { optionValues: { Rozmiar: "Mały" }, title: "Mały" },
      { optionValues: { Rozmiar: "Duży" }, title: "Duży" },
    ])
  })

  it("prefers a persisted value id over the label", () => {
    const [first] = buildVariantCombinations([option("Rozmiar", [{ id: "value-s", pl: "Mały" }], "option-size")])

    expect(first?.optionValues).toStrictEqual({ "option-size": "value-s" })
  })

  it("expands two options into their cartesian product", () => {
    const combinations = buildVariantCombinations([
      option("Rozmiar", [{ pl: "Mały" }, { pl: "Duży" }]),
      option("Kolor", [{ pl: "Srebro" }, { pl: "Złoto" }]),
    ])

    expect(combinations).toHaveLength(4)
    expect(combinations.map((combination) => combination.title)).toStrictEqual([
      "Mały / Srebro",
      "Mały / Złoto",
      "Duży / Srebro",
      "Duży / Złoto",
    ])
  })

  it("drops an option whose title is not translated in every locale", () => {
    const partial: ProductOptionDraft = { titles: { "en-US": "", "pl-PL": "Rozmiar" }, values: [{ labels: locales("Mały") }] }

    expect(buildVariantCombinations([partial])).toStrictEqual([{ optionValues: {}, title: DEFAULT_VARIANT_TITLE }])
  })

  it("drops a value that is not translated in every locale", () => {
    const combinations = buildVariantCombinations([
      { titles: locales("Rozmiar"), values: [{ labels: locales("Mały") }, { labels: { "en-US": "", "pl-PL": "Duży" } }] },
    ])

    expect(combinations).toHaveLength(1)
  })

  it("collapses duplicate values so the same variant is not created twice", () => {
    const combinations = buildVariantCombinations([option("Rozmiar", [{ pl: "Mały" }, { pl: " Mały " }])])

    expect(combinations).toHaveLength(1)
  })
})

describe("buildVariantCombinationsFromFormDrafts", () => {
  it("keeps an untranslated draft row so the admin can keep editing it", () => {
    const combinations = buildVariantCombinationsFromFormDrafts([
      { titles: { "en-US": "", "pl-PL": "Rozmiar" }, values: [{ labels: locales("Mały") }] },
    ])

    expect(combinations).toStrictEqual([{ optionValues: { Rozmiar: "Mały" }, title: "Mały" }])
  })

  it("keys a wholly blank draft value positionally so rows stay distinct", () => {
    const combinations = buildVariantCombinationsFromFormDrafts([
      { titles: locales("Rozmiar"), values: [{ labels: locales("") }, { labels: locales("") }] },
    ])

    expect(combinations.map((combination) => combination.optionValues)).toStrictEqual([{ Rozmiar: "__draft_0" }, { Rozmiar: "__draft_1" }])
  })

  it("drops an option that has no value rows at all", () => {
    expect(buildVariantCombinationsFromFormDrafts([{ titles: locales("Rozmiar"), values: [] }])).toStrictEqual([
      { optionValues: {}, title: DEFAULT_VARIANT_TITLE },
    ])
  })
})

describe("normalizeOptionDrafts", () => {
  it("trims titles and drops untranslated values", () => {
    const [normalized] = normalizeOptionDrafts([
      {
        titles: { "en-US": " Size ", "pl-PL": " Rozmiar " },
        values: [{ labels: locales("Mały", "Small") }, { labels: { "en-US": "", "pl-PL": "Duży" } }],
      },
    ])

    expect(normalized?.titles).toStrictEqual({ "en-US": "Size", "pl-PL": "Rozmiar" })
    expect(normalized?.values).toHaveLength(1)
  })

  it("drops an option whose title is incomplete after trimming", () => {
    expect(normalizeOptionDrafts([{ titles: { "en-US": "  ", "pl-PL": "Rozmiar" }, values: [{ labels: locales("Mały") }] }])).toStrictEqual(
      [],
    )
  })

  it("caps the option count at the supported maximum", () => {
    const options = Array.from({ length: MAX_PRODUCT_OPTIONS + 2 }, (_, index) => option(`Opcja ${index}`, [{ pl: `Wartość ${index}` }]))

    expect(normalizeOptionDrafts(options)).toHaveLength(MAX_PRODUCT_OPTIONS)
  })
})

describe("inferHasVariants", () => {
  it("treats more than one persisted variant as a variant product", () => {
    expect(inferHasVariants([], 2)).toBe(true)
    expect(inferHasVariants([], 1)).toBe(false)
    expect(inferHasVariants([], 0)).toBe(false)
  })

  it("treats a single variant with a multi-value option as a variant product", () => {
    expect(inferHasVariants([{ values: [{}, {}] }], 1)).toBe(true)
    expect(inferHasVariants([{ values: [{}] }], 1)).toBe(false)
  })

  it("counts distinct option values on the join rows when the option values are not loaded", () => {
    expect(inferHasVariants([{ optionOnVariants: [{ valueId: "a" }, { valueId: "a" }] }], 1)).toBe(false)
    expect(inferHasVariants([{ optionOnVariants: [{ valueId: "a" }, { valueId: "b" }] }], 1)).toBe(true)
  })

  it("treats an option with no rows at all as single-variant", () => {
    expect(inferHasVariants([{}], 1)).toBe(false)
  })
})

describe("resolveVariantOptionValueIds", () => {
  it("maps each option id to the selected value id", () => {
    expect(
      resolveVariantOptionValueIds({
        optionOnVariants: [
          { option: { id: "option-size" }, value: { id: "value-s" } },
          { option: { id: "option-color" }, value: { id: "value-silver" } },
        ],
      }),
    ).toStrictEqual({ "option-color": "value-silver", "option-size": "value-s" })
  })

  it("is empty for a variant with no option rows", () => {
    expect(resolveVariantOptionValueIds({})).toStrictEqual({})
    expect(resolveVariantOptionValueIds({ optionOnVariants: [] })).toStrictEqual({})
  })
})

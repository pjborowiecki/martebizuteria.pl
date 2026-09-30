import { describe, expect, it } from "vite-plus/test"

import {
  PRODUCT_ATTRIBUTE_STAT_FILTER,
  PRODUCT_ATTRIBUTE_TYPE,
  type ProductAttributeType,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeAllowedValues,
  coerceProductAttributeLocaleMap,
  computeProductAttributeStats,
  createEmptyProductAttributeLocaleMap,
  filterAdminProductAttributesByStat,
  formatAdminProductAttributeAllowedValuesList,
  formatProductAttributeLocaleMapChipExtras,
  formatProductAttributeValueForDisplay,
  isProductAttributeLocaleCode,
  isProductAttributeLocaleMapComplete,
  isProductAttributeUnitPreset,
  localeFillMap,
  normalizeAllowedValuesForSave,
  normalizeProductAttributeLocaleMapForSave,
  parseMultiselectStoredValue,
  parseProductAttributeValueForType,
  resolveAllowedValueLabel,
  resolveLocalizedString,
  resolveProductAttributeTitle,
  resolveProductAttributeUnitSelectValue,
  stringifyMultiselectStoredValue,
} from "~/src/modules/product-attribute/product-attribute.utils"

const localeMap = (pl: string, en: string): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const attributeListItem = (handle: string, productCount: number, type: ProductAttributeType): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date(2024, 0, 1),
  handle,
  id: `attribute-${handle}`,
  productCount,
  rank: 0,
  titles: localeMap(handle, handle),
  type,
  unit: null,
  updatedAt: new Date(2024, 0, 1),
})

describe("createEmptyProductAttributeLocaleMap", () => {
  it("gives every supported locale an empty string", () => {
    expect(createEmptyProductAttributeLocaleMap()).toStrictEqual({ "en-US": "", "pl-PL": "" })
  })
})

describe("coerceProductAttributeLocaleMap", () => {
  it.each([[null], [undefined]])("falls back to an empty map for %j", (value) => {
    expect(coerceProductAttributeLocaleMap(value)).toStrictEqual(createEmptyProductAttributeLocaleMap())
  })

  it("fills a locale the stored map is missing", () => {
    expect(coerceProductAttributeLocaleMap({ "en-US": "Material" })).toStrictEqual(localeMap("", "Material"))
  })

  it("keeps whitespace so the editor can still show what was typed", () => {
    expect(coerceProductAttributeLocaleMap(localeMap("  Materiał  ", ""))["pl-PL"]).toBe("  Materiał  ")
  })

  it.each(["{broken", '{"pl-PL":"Materiał"'])("preserves malformed serialized labels as the original text: %s", (value) => {
    expect(coerceProductAttributeLocaleMap(value)).toStrictEqual(localeMap(value, ""))
  })

  it("reads a serialized locale map back into its locales", () => {
    expect(coerceProductAttributeLocaleMap('{"pl-PL":"Materiał","en-US":"Material"}')).toStrictEqual(localeMap("Materiał", "Material"))
  })

  it("fills the locales a serialized map leaves out", () => {
    expect(coerceProductAttributeLocaleMap('{"en-US":"Material"}')).toStrictEqual(localeMap("", "Material"))
  })
})

describe("normalizeProductAttributeLocaleMapForSave", () => {
  it("trims every locale before it reaches the database", () => {
    expect(normalizeProductAttributeLocaleMapForSave(localeMap("  Materiał ", " Material "))).toStrictEqual(
      localeMap("Materiał", "Material"),
    )
  })
})

describe("isProductAttributeLocaleMapComplete", () => {
  it("requires a non-blank translation in every locale", () => {
    expect(isProductAttributeLocaleMapComplete(localeMap("Materiał", "Material"))).toBe(true)
    expect(isProductAttributeLocaleMapComplete(localeMap("Materiał", "   "))).toBe(false)
  })
})

describe("localeFillMap", () => {
  it("reports which locales carry content", () => {
    expect(localeFillMap(localeMap("Materiał", "  "))).toStrictEqual({ "en-US": false, "pl-PL": true })
  })

  it("treats a missing map as entirely unfilled", () => {
    expect(localeFillMap(undefined)).toStrictEqual({ "en-US": false, "pl-PL": false })
  })
})

describe("formatProductAttributeLocaleMapChipExtras", () => {
  it("lists only the translations that differ from the primary locale", () => {
    expect(formatProductAttributeLocaleMapChipExtras(localeMap("Materiał", "Material"))).toStrictEqual(["Material"])
  })

  it("hides a duplicate translation", () => {
    expect(formatProductAttributeLocaleMapChipExtras(localeMap("Material", "Material"))).toStrictEqual([])
  })

  it("honours a different primary locale", () => {
    expect(formatProductAttributeLocaleMapChipExtras(localeMap("Materiał", "Material"), "en-US")).toStrictEqual(["Materiał"])
  })
})

describe("isProductAttributeLocaleCode", () => {
  it("accepts the supported BCP-47 tags only", () => {
    expect(isProductAttributeLocaleCode("pl-PL")).toBe(true)
    expect(isProductAttributeLocaleCode("en-US")).toBe(true)
    expect(isProductAttributeLocaleCode("pl")).toBe(false)
    expect(isProductAttributeLocaleCode("de-DE")).toBe(false)
  })
})

describe("resolveLocalizedString", () => {
  it("prefers the requested locale", () => {
    expect(resolveLocalizedString(localeMap("Materiał", "Material"), "en-US")).toBe("Material")
  })

  it("falls back to the default locale when the requested one is blank", () => {
    expect(resolveLocalizedString(localeMap("Materiał", "  "), "en-US")).toBe("Materiał")
  })

  it("falls back to any translated locale when the default is blank too", () => {
    expect(resolveLocalizedString(localeMap("", "Material"), "pl-PL")).toBe("Material")
  })

  it("treats an unsupported locale as the default locale", () => {
    expect(resolveLocalizedString(localeMap("Materiał", "Material"), "de-DE")).toBe("Materiał")
  })

  it("returns an empty string when nothing is translated", () => {
    expect(resolveLocalizedString(localeMap(" ", ""), "pl-PL")).toBe("")
  })

  it("is what resolveProductAttributeTitle delegates to", () => {
    expect(resolveProductAttributeTitle(localeMap("Materiał", "Material"), "en-US")).toBe("Material")
  })
})

describe("coerceProductAttributeAllowedValues", () => {
  it.each([[null], [undefined]])("returns undefined for %j", (value) => {
    expect(coerceProductAttributeAllowedValues(value)).toBeUndefined()
  })

  it("rejects a shape that is not a list of value/label pairs", () => {
    expect(coerceProductAttributeAllowedValues([{ value: 1 }])).toBeUndefined()
    expect(coerceProductAttributeAllowedValues({ value: "silver" })).toBeUndefined()
  })

  it("normalises each entry's labels to the supported locales", () => {
    expect(coerceProductAttributeAllowedValues([{ labels: { "de-DE": "Silber", "pl-PL": "Srebro" }, value: "silver" }])).toStrictEqual([
      { labels: localeMap("Srebro", ""), value: "silver" },
    ])
  })
})

describe("allowed value labels", () => {
  const silver: ProductAttribute["allowedValue"] = { labels: localeMap("Srebro", "Silver"), value: "silver" }

  it("falls back to the stable key when no label is translated", () => {
    expect(resolveAllowedValueLabel({ labels: localeMap("", ""), value: "silver" }, "pl-PL")).toBe("silver")
  })

  it("uses the translated label when present", () => {
    expect(resolveAllowedValueLabel(silver, "en-US")).toBe("Silver")
  })

  it("joins labels for choice attributes", () => {
    expect(
      formatAdminProductAttributeAllowedValuesList({
        allowedValues: [silver, { labels: localeMap("Złoto", "Gold"), value: "gold" }],
        locale: "pl-PL",
        type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
      }),
    ).toBe("Srebro, Złoto")
  })

  it.each([[PRODUCT_ATTRIBUTE_TYPE.TEXT], [PRODUCT_ATTRIBUTE_TYPE.NUMBER], [PRODUCT_ATTRIBUTE_TYPE.BOOLEAN]])(
    "stays empty for the non-choice type %s",
    (type) => {
      expect(formatAdminProductAttributeAllowedValuesList({ allowedValues: [silver], locale: "pl-PL", type })).toBe("")
    },
  )

  it.each([[null], [undefined], [[]]])("stays empty when the choice list is %j", (allowedValues) => {
    expect(formatAdminProductAttributeAllowedValuesList({ allowedValues, locale: "pl-PL", type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT })).toBe(
      "",
    )
  })

  it("trims labels before saving without touching the stable key", () => {
    expect(normalizeAllowedValuesForSave([{ labels: localeMap("  Srebro ", " Silver "), value: " silver " }])).toStrictEqual([
      { labels: localeMap("Srebro", "Silver"), value: " silver " },
    ])
  })
})

describe("unit presets", () => {
  it("recognises the quick-pick units", () => {
    expect(isProductAttributeUnitPreset("mm")).toBe(true)
    expect(isProductAttributeUnitPreset("furlong")).toBe(false)
  })

  it("maps a blank unit to no selection", () => {
    expect(resolveProductAttributeUnitSelectValue("   ")).toBe("")
  })

  it("selects the preset when it matches and the custom sentinel otherwise", () => {
    expect(resolveProductAttributeUnitSelectValue(" kg ")).toBe("kg")
    expect(resolveProductAttributeUnitSelectValue("karat")).toBe("__custom__")
  })
})

describe("multiselect storage", () => {
  it("reads the JSON array form", () => {
    expect(parseMultiselectStoredValue('["silver","gold"]')).toStrictEqual(["silver", "gold"])
  })

  it("drops non-string entries from a JSON array", () => {
    expect(parseMultiselectStoredValue('["silver",7,null]')).toStrictEqual(["silver"])
  })

  it("falls back to the legacy comma separated form", () => {
    expect(parseMultiselectStoredValue(" silver , gold ,, ")).toStrictEqual(["silver", "gold"])
  })

  it("reads an empty value as no selection", () => {
    expect(parseMultiselectStoredValue("   ")).toStrictEqual([])
  })

  it("round trips through the writer", () => {
    expect(parseMultiselectStoredValue(stringifyMultiselectStoredValue(["silver", "gold"]))).toStrictEqual(["silver", "gold"])
  })
})

describe("parseProductAttributeValueForType", () => {
  it.each([["true"], ["1"], ["Yes"], [" yes "]])("stores the truthy boolean input %j as true", (raw) => {
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, raw)).toBe("true")
  })

  it.each([["false"], ["0"], ["No"], [""]])("stores the falsy boolean input %j as false", (raw) => {
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, raw)).toBe("false")
  })

  it("keeps an unrecognised boolean input for the caller to reject", () => {
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, " maybe ")).toBe("maybe")
  })

  it("keeps a select value even when it is not in the allowed list", () => {
    const allowedValues = [{ labels: localeMap("Srebro", "Silver"), value: "silver" }]

    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.SELECT, " silver ", allowedValues)).toBe("silver")
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.SELECT, "platinum", allowedValues)).toBe("platinum")
  })

  it("canonicalises a multiselect value to JSON", () => {
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.MULTISELECT, "silver, gold")).toBe('["silver","gold"]')
  })

  it("trims a number but leaves text untouched", () => {
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.NUMBER, "  18  ")).toBe("18")
    expect(parseProductAttributeValueForType(PRODUCT_ATTRIBUTE_TYPE.TEXT, "  hand made  ")).toBe("  hand made  ")
  })
})

describe("formatProductAttributeValueForDisplay", () => {
  const allowedValues = [
    { labels: localeMap("Srebro", "Silver"), value: "silver" },
    { labels: localeMap("Złoto", "Gold"), value: "gold" },
  ]

  it("renders booleans as yes or no", () => {
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, "true", { locale: "pl-PL" })).toBe("Yes")
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, "anything else", { locale: "pl-PL" })).toBe("No")
  })

  it("resolves a select key to its localized label", () => {
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.SELECT, "gold", { allowedValues, locale: "en-US" })).toBe("Gold")
  })

  it("shows an orphaned select key rather than nothing", () => {
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.SELECT, "platinum", { allowedValues, locale: "en-US" })).toBe(
      "platinum",
    )
  })

  it("joins resolved multiselect labels and keeps orphaned keys", () => {
    expect(
      formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.MULTISELECT, '["gold","platinum"]', {
        allowedValues,
        locale: "pl-PL",
      }),
    ).toBe("Złoto, platinum")
  })

  it("appends the unit to a number only when there is one", () => {
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.NUMBER, "18", { locale: "pl-PL", unit: "mm" })).toBe("18 mm")
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.NUMBER, "18", { locale: "pl-PL", unit: null })).toBe("18")
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.NUMBER, "18", { locale: "pl-PL", unit: "" })).toBe("18")
  })

  it("passes text through unchanged", () => {
    expect(formatProductAttributeValueForDisplay(PRODUCT_ATTRIBUTE_TYPE.TEXT, "hand made", { locale: "pl-PL" })).toBe("hand made")
  })
})

describe("productAttributeTypeUsesAllowedValues", () => {
  it.each([
    [PRODUCT_ATTRIBUTE_TYPE.SELECT, true],
    [PRODUCT_ATTRIBUTE_TYPE.MULTISELECT, true],
    [PRODUCT_ATTRIBUTE_TYPE.TEXT, false],
    [PRODUCT_ATTRIBUTE_TYPE.NUMBER, false],
    [PRODUCT_ATTRIBUTE_TYPE.BOOLEAN, false],
  ])("reports %s as %s", (type, expected) => {
    expect(productAttributeTypeUsesAllowedValues(type)).toBe(expected)
  })
})

describe("admin attribute stats", () => {
  const items = [
    attributeListItem("materials", 3, PRODUCT_ATTRIBUTE_TYPE.SELECT),
    attributeListItem("care", 0, PRODUCT_ATTRIBUTE_TYPE.TEXT),
    attributeListItem("stones", 0, PRODUCT_ATTRIBUTE_TYPE.MULTISELECT),
  ]

  it("counts used, unused and choice attributes independently", () => {
    expect(computeProductAttributeStats(items)).toStrictEqual({ inUse: 1, total: 3, unused: 2, withChoices: 2 })
  })

  it("reports zeroes for an empty catalog", () => {
    expect(computeProductAttributeStats([])).toStrictEqual({ inUse: 0, total: 0, unused: 0, withChoices: 0 })
  })

  it.each([
    [PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE, 1],
    [PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED, 2],
    [PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE, 2],
  ])("narrows the table to the %s stat card", (filter, expected) => {
    expect(filterAdminProductAttributesByStat(items, filter)).toHaveLength(expected)
  })

  it("returns a copy of every row when no stat card is active", () => {
    const unfiltered = filterAdminProductAttributesByStat(items, undefined)

    expect(unfiltered).toStrictEqual(items)
    expect(unfiltered).not.toBe(items)
  })
})

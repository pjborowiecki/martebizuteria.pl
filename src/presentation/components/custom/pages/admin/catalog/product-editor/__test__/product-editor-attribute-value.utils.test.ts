import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"

import {
  isProductAttributeValueComplete,
  toProductEditorAttributeDefinition,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value.utils"

describe("isProductAttributeValueComplete", () => {
  it("treats blank and whitespace-only values as incomplete for every type", () => {
    expect(isProductAttributeValueComplete(undefined, "")).toBe(false)
    expect(isProductAttributeValueComplete({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "   ")).toBe(false)
    expect(isProductAttributeValueComplete({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, "\t\n")).toBe(false)
  })

  it("defaults a missing definition to text, where any non-blank value counts", () => {
    expect(isProductAttributeValueComplete(undefined, "18k gold")).toBe(true)
  })

  it("accepts only the two boolean literals", () => {
    const definition = { allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN } as const

    expect(isProductAttributeValueComplete(definition, "true")).toBe(true)
    expect(isProductAttributeValueComplete(definition, " false ")).toBe(true)
    expect(isProductAttributeValueComplete(definition, "TRUE")).toBe(false)
    expect(isProductAttributeValueComplete(definition, "1")).toBe(false)
  })

  it("requires at least one selected key for a multiselect", () => {
    const definition = { allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT } as const

    expect(isProductAttributeValueComplete(definition, "[]")).toBe(false)
    expect(isProductAttributeValueComplete(definition, '["gold"]')).toBe(true)
    expect(isProductAttributeValueComplete(definition, "gold, silver")).toBe(true)
  })

  it("accepts any non-blank number or select value without parsing it", () => {
    expect(isProductAttributeValueComplete({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER }, "not-a-number")).toBe(true)
    expect(isProductAttributeValueComplete({ allowedValues: [], type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "gold")).toBe(true)
  })
})

describe("toProductEditorAttributeDefinition", () => {
  it("returns undefined when no attribute row was found", () => {
    expect(toProductEditorAttributeDefinition(undefined)).toBeUndefined()
  })

  it("keeps only the fields the value input needs", () => {
    const definition = toProductEditorAttributeDefinition({
      allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }],
      createdAt: new Date(0),
      handle: "material",
      id: "attr-1",
      rank: 0,
      titles: { "en-US": "Material", "pl-PL": "Materiał" },
      type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
      unit: "g",
      updatedAt: new Date(0),
    })

    expect(definition).toStrictEqual({
      allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }],
      type: "select",
      unit: "g",
    })
  })
})

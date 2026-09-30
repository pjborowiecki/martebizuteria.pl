import { describe, expect, it } from "vite-plus/test"

import {
  PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN,
  PRODUCT_ATTRIBUTE_HANDLE_PATTERN,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING,
  PRODUCT_ATTRIBUTE_TYPE,
  PRODUCT_ATTRIBUTE_TYPES,
  isProductAttributeType,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"

describe("isProductAttributeType", () => {
  it.each([...PRODUCT_ATTRIBUTE_TYPES])("accepts the supported type %s", (type) => {
    expect(isProductAttributeType(type)).toBe(true)
  })

  it.each(["", "Text", "TEXT", "textarea", "date", "boolean ", "select,multiselect"])("rejects %j", (value) => {
    expect(isProductAttributeType(value)).toBe(false)
  })

  it("recognizes exactly the declared type constants", () => {
    expect(new Set(PRODUCT_ATTRIBUTE_TYPES)).toStrictEqual(new Set(Object.values(PRODUCT_ATTRIBUTE_TYPE)))
  })
})

describe("productAttributeTypeUsesAllowedValues", () => {
  it.each([PRODUCT_ATTRIBUTE_TYPE.SELECT, PRODUCT_ATTRIBUTE_TYPE.MULTISELECT])("requires a choice list for %s", (type) => {
    expect(productAttributeTypeUsesAllowedValues(type)).toBe(true)
  })

  it.each([PRODUCT_ATTRIBUTE_TYPE.TEXT, PRODUCT_ATTRIBUTE_TYPE.NUMBER, PRODUCT_ATTRIBUTE_TYPE.BOOLEAN])(
    "does not require a choice list for %s",
    (type) => {
      expect(productAttributeTypeUsesAllowedValues(type)).toBe(false)
    },
  )
})

describe("PRODUCT_ATTRIBUTE_HANDLE_PATTERN", () => {
  it.each(["color", "shoe-size", "a", "a1", "ring-size-eu", "9"])("accepts %j", (handle) => {
    expect(PRODUCT_ATTRIBUTE_HANDLE_PATTERN.test(handle)).toBe(true)
  })

  it.each(["", "-color", "color-", "Color", "shoe_size", "shoe size", "shoe--size", "kolor-złoty", "color."])("rejects %j", (handle) => {
    expect(PRODUCT_ATTRIBUTE_HANDLE_PATTERN.test(handle)).toBe(false)
  })
})

describe("PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN", () => {
  it("accepts a lowercase dash separated key", () => {
    expect(PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN.test("rose-gold")).toBe(true)
  })

  it("rejects a key with uppercase letters or spaces", () => {
    expect(PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN.test("Rose Gold")).toBe(false)
  })
})

describe("PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING", () => {
  it("pins the row affordances at the start and the actions at the end", () => {
    expect(PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING.start).toStrictEqual(["select", "drag", "title"])
    expect(PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING.end).toStrictEqual(["actions"])
  })

  it("pins only ids the table actually declares", () => {
    const declared = new Set<string>(Object.values(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID))

    for (const id of [...PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING.start, ...PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING.end]) {
      expect(declared.has(id)).toBe(true)
    }
  })
})

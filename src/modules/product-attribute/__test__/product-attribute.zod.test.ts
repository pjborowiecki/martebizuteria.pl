import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  PRODUCT_ATTRIBUTE_COLUMN_LENGTH,
  PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS,
  PRODUCT_ATTRIBUTE_TYPE,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

const titles = { "en-US": "Colour", "pl-PL": "Kolor" }

const allowedValue = {
  labels: { "en-US": "Rose gold", "pl-PL": "Różowe złoto" },
  value: "rose-gold",
}

const textAttribute = {
  allowedValues: [],
  handle: "engraving",
  titles,
  type: PRODUCT_ATTRIBUTE_TYPE.TEXT,
  unit: "",
}

describe("productAttributeZodSchemas.localeMapRequired", () => {
  it("accepts a title for every supported locale", () => {
    expect(productAttributeZodSchemas.localeMapRequired.parse(titles)).toStrictEqual(titles)
  })

  it("trims surrounding whitespace", () => {
    expect(productAttributeZodSchemas.localeMapRequired.parse({ "en-US": "  Colour  ", "pl-PL": "Kolor" })).toStrictEqual(titles)
  })

  it.each([...I18N.SUPPORTED_LOCALES])("reports a whitespace-only %s title on that locale's path", (locale) => {
    const parsed = productAttributeZodSchemas.localeMapRequired.safeParse({ ...titles, [locale]: "   " })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues).toStrictEqual([
      expect.objectContaining({
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.localeTitleRequired,
        path: [locale],
      }),
    ])
  })

  it("rejects a map that is missing a locale", () => {
    expect(productAttributeZodSchemas.localeMapRequired.safeParse({ "en-US": "Colour" }).success).toBe(false)
  })

  it("rejects a title longer than the column allows", () => {
    expect(
      productAttributeZodSchemas.localeMapRequired.safeParse({ ...titles, "en-US": "c".repeat(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.title + 1) })
        .success,
    ).toBe(false)
  })
})

describe("productAttributeZodSchemas.allowedValue", () => {
  it("accepts a dash separated key with labels for every locale", () => {
    expect(productAttributeZodSchemas.allowedValue.parse(allowedValue)).toStrictEqual(allowedValue)
  })

  it.each(["", "Rose-Gold", "rose gold", "rose_gold", "-rose", "rose-"])("rejects the key %j", (value) => {
    expect(productAttributeZodSchemas.allowedValue.safeParse({ ...allowedValue, value }).success).toBe(false)
  })

  it("rejects a key longer than the column allows", () => {
    const value = "a".repeat(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.allowedValueKey + 1)

    expect(productAttributeZodSchemas.allowedValue.safeParse({ ...allowedValue, value }).success).toBe(false)
  })

  it("requires a label in each locale", () => {
    const parsed = productAttributeZodSchemas.allowedValue.safeParse({ ...allowedValue, labels: { "en-US": "", "pl-PL": "Różowe złoto" } })

    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toStrictEqual(["labels.en-US"])
  })
})

describe("product attribute create input", () => {
  it("accepts a text attribute without allowed values", () => {
    expect(productAttributeZodSchemas.createInput.parse(textAttribute)).toStrictEqual(textAttribute)
  })

  it("keeps the allowed values of a select attribute", () => {
    const parsed = productAttributeZodSchemas.createInput.parse({
      ...textAttribute,
      allowedValues: [allowedValue],
      type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
    })

    expect(parsed.allowedValues).toStrictEqual([allowedValue])
  })

  it.each([PRODUCT_ATTRIBUTE_TYPE.SELECT, PRODUCT_ATTRIBUTE_TYPE.MULTISELECT])("requires allowed values for %s", (type) => {
    const parsed = productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, type })

    expect(parsed.error?.issues).toStrictEqual([
      expect.objectContaining({
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.allowedValuesRequired,
        path: ["allowedValues"],
      }),
    ])
  })

  it.each([PRODUCT_ATTRIBUTE_TYPE.TEXT, PRODUCT_ATTRIBUTE_TYPE.NUMBER, PRODUCT_ATTRIBUTE_TYPE.BOOLEAN])(
    "allows %s to carry no allowed values",
    (type) => {
      expect(productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, type }).success).toBe(true)
    },
  )

  it("reports a blank handle with the required key", () => {
    const parsed = productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, handle: "   " })

    expect(parsed.error?.issues.map((issue) => issue.message)).toContain(PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleRequired)
  })

  it("reports a malformed handle with the invalid key", () => {
    const parsed = productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, handle: "Ring Size" })

    expect(parsed.error?.issues.map((issue) => issue.message)).toStrictEqual([PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleInvalid])
  })

  it("trims the handle before validating it", () => {
    expect(productAttributeZodSchemas.createInput.parse({ ...textAttribute, handle: "  ring-size  " }).handle).toBe("ring-size")
  })

  it("rejects an unknown attribute type", () => {
    expect(productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, type: "richtext" }).success).toBe(false)
  })

  it("rejects a unit longer than the column allows", () => {
    const unit = "u".repeat(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit + 1)

    expect(productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, unit }).success).toBe(false)
  })
})

describe("productAttributeZodSchemas.createInput as the form schema", () => {
  it("validates the same shape as the create input", () => {
    expect(productAttributeZodSchemas.createInput.safeParse(textAttribute).success).toBe(true)
    expect(productAttributeZodSchemas.createInput.safeParse({ ...textAttribute, handle: "" }).success).toBe(false)
  })
})

describe("product attribute update input", () => {
  it("requires an id alongside the create fields", () => {
    expect(productAttributeZodSchemas.updateInput.safeParse(textAttribute).success).toBe(false)
    expect(productAttributeZodSchemas.updateInput.parse({ ...textAttribute, id: "attr-1" }).id).toBe("attr-1")
  })

  it("rejects a blank id", () => {
    expect(productAttributeZodSchemas.updateInput.safeParse({ ...textAttribute, id: "  " }).success).toBe(false)
  })
})

describe("product attribute id list inputs", () => {
  it.each([
    ["deleteInput", productAttributeZodSchemas.deleteInput],
    ["reorderInput", productAttributeZodSchemas.reorderInput],
  ] as const)("%s rejects an empty list and accepts ids", (_name, schema) => {
    expect(schema.safeParse([]).success).toBe(false)
    expect(schema.parse([" attr-1 ", "attr-2"])).toStrictEqual(["attr-1", "attr-2"])
  })
})

describe("product attribute stats", () => {
  it("requires every counter", () => {
    const stats = { inUse: 3, total: 5, unused: 2, withChoices: 1 }

    expect(productAttributeZodSchemas.stats.parse(stats)).toStrictEqual(stats)
    expect(productAttributeZodSchemas.stats.safeParse({ inUse: 3, total: 5, unused: 2 }).success).toBe(false)
  })
})

describe("product attribute admin list item", () => {
  it("adds a numeric product count to the selected row", () => {
    const row = {
      allowedValues: [allowedValue],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      handle: "colour",
      id: "attr-1",
      productCount: 4,
      rank: 0,
      titles,
      type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
      unit: null,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    }

    expect(productAttributeZodSchemas.adminListItem.parse(row).productCount).toBe(4)
    expect(productAttributeZodSchemas.adminListItem.safeParse({ ...row, productCount: "4" }).success).toBe(false)
  })
})

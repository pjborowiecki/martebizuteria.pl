import { describe, expect, it } from "vite-plus/test"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  attributeToFormValues,
  createDefaultAttributeFormValues,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form.utils"

const listItem = (overrides: Partial<ProductAttribute["adminListItem"]>): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date(2026, 0, 1),
  handle: "material",
  id: "attribute-material",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "text",
  unit: null,
  updatedAt: new Date(2026, 0, 1),
  ...overrides,
})

describe("createDefaultAttributeFormValues", () => {
  it("opens a blank text attribute with both locales empty", () => {
    expect(createDefaultAttributeFormValues()).toStrictEqual({
      allowedValues: [],
      handle: "",
      titles: { "en-US": "", "pl-PL": "" },
      type: "text",
      unit: "",
    })
  })

  it("hands out a fresh object each time so one form cannot mutate the next", () => {
    const first = createDefaultAttributeFormValues()
    const second = createDefaultAttributeFormValues()

    expect(first).not.toBe(second)
    expect(first.titles).not.toBe(second.titles)
  })
})

describe("attributeToFormValues", () => {
  it("turns a missing unit into an empty input value", () => {
    expect(attributeToFormValues(listItem({ unit: null })).unit).toBe("")
  })

  it("keeps a stored unit", () => {
    expect(attributeToFormValues(listItem({ unit: "mm" })).unit).toBe("mm")
  })

  it("fills a locale the stored titles are missing", () => {
    expect(attributeToFormValues(listItem({ titles: { "en-US": "Material", "pl-PL": "" } })).titles).toStrictEqual({
      "en-US": "Material",
      "pl-PL": "",
    })
  })

  it("keeps the rows whose keys and labels are complete", () => {
    const values = attributeToFormValues(
      listItem({
        allowedValues: [
          { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
          { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold-plated" },
        ],
        type: "select",
      }),
    )

    expect(values.allowedValues).toStrictEqual([
      { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
      { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold-plated" },
    ])
  })

  it("drops a row whose key breaks the handle pattern", () => {
    const values = attributeToFormValues(
      listItem({
        allowedValues: [
          { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "Silver Plated" },
          { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
        ],
        type: "select",
      }),
    )

    expect(values.allowedValues).toStrictEqual([{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }])
  })

  it("drops a row that is missing a locale label", () => {
    const values = attributeToFormValues(
      listItem({
        allowedValues: [{ labels: { "en-US": "Silver", "pl-PL": "   " }, value: "silver" }],
        type: "select",
      }),
    )

    expect(values.allowedValues).toStrictEqual([])
  })

  it("treats stored allowed values of null as no rows", () => {
    expect(attributeToFormValues(listItem({ allowedValues: null })).allowedValues).toStrictEqual([])
  })

  it("carries the handle and the type through untouched", () => {
    const values = attributeToFormValues(listItem({ handle: "ring-size", type: "number" }))

    expect(values.handle).toBe("ring-size")
    expect(values.type).toBe("number")
  })
})

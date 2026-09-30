import { describe, expect, it } from "vite-plus/test"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { localesWithIncompleteCollectionFormValues } from "../collection-form-locale.utils"
import { adminListItemToFormValues, createDefaultCollectionFormValues, slugify } from "../collection-form.utils"

const adminListItem = (overrides: Partial<ProductCollection["adminListItem"]> = {}): ProductCollection["adminListItem"] => ({
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  descriptions: { "en-US": "Rings in silver", "pl-PL": "Pierścionki ze srebra" },
  handle: "silver-rings",
  id: "11111111-1111-7111-8111-111111111111",
  image: "https://cdn.example.test/silver.webp",
  metadata: null,
  productCount: 4,
  rank: 2,
  status: "active",
  titles: { "en-US": "Silver rings", "pl-PL": "Srebrne pierścionki" },
  updatedAt: new Date("2026-09-02T00:00:00.000Z"),
  ...overrides,
})

describe("createDefaultCollectionFormValues", () => {
  it("starts as an empty draft with one blank title and description per locale", () => {
    expect(createDefaultCollectionFormValues()).toStrictEqual({
      descriptions: { "en-US": "", "pl-PL": "" },
      handle: "",
      image: "",
      status: "draft",
      titles: { "en-US": "", "pl-PL": "" },
    })
  })

  it("hands out a fresh object each call so two forms cannot share state", () => {
    expect(createDefaultCollectionFormValues()).not.toBe(createDefaultCollectionFormValues())
  })
})

describe("adminListItemToFormValues", () => {
  it("carries the handle, status and localized maps across unchanged", () => {
    expect(adminListItemToFormValues(adminListItem())).toStrictEqual({
      descriptions: { "en-US": "Rings in silver", "pl-PL": "Pierścionki ze srebra" },
      handle: "silver-rings",
      image: "https://cdn.example.test/silver.webp",
      status: "active",
      titles: { "en-US": "Silver rings", "pl-PL": "Srebrne pierścionki" },
    })
  })

  it("turns a missing image into the empty string the input expects", () => {
    expect(adminListItemToFormValues(adminListItem({ image: null })).image).toBe("")
  })

  it("fills every locale when the stored descriptions are absent", () => {
    expect(adminListItemToFormValues(adminListItem({ descriptions: null })).descriptions).toStrictEqual({ "en-US": "", "pl-PL": "" })
  })
})

describe("localesWithIncompleteCollectionFormValues", () => {
  it("reports no locale when every title carries text", () => {
    const values = adminListItemToFormValues(adminListItem())

    expect(localesWithIncompleteCollectionFormValues(values)).toStrictEqual([])
  })

  it("reports only the locales whose title is blank or whitespace", () => {
    const values = adminListItemToFormValues(adminListItem({ titles: { "en-US": "   ", "pl-PL": "Srebrne pierścionki" } }))

    expect(localesWithIncompleteCollectionFormValues(values)).toStrictEqual(["en-US"])
  })

  it("reports every locale for a brand new draft", () => {
    expect(localesWithIncompleteCollectionFormValues(createDefaultCollectionFormValues())).toStrictEqual(["pl-PL", "en-US"])
  })
})

describe("slugify re-exported for the collection form", () => {
  it("folds Polish diacritics and collapses separators into a handle", () => {
    expect(slugify("  Srebrne Pierścionki & Łańcuszki  ")).toBe("srebrne-pierscionki-lancuszki")
  })
})

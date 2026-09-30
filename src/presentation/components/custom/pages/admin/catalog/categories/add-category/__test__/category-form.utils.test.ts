import { describe, expect, it } from "vite-plus/test"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import {
  adminListItemToFormValues,
  createDefaultCategoryFormValues,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form.utils"

const EMPTY_MAP = { "en-US": "", "pl-PL": "" }

const listItem = (overrides: Partial<ProductCategory["adminListItem"]>): ProductCategory["adminListItem"] => ({
  createdAt: new Date(2026, 0, 1),
  descriptions: null,
  handle: "rings",
  id: "category-rings",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 0,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
  updatedAt: new Date(2026, 0, 1),
  ...overrides,
})

describe("createDefaultCategoryFormValues", () => {
  it("opens a blank draft category with every locale map empty", () => {
    expect(createDefaultCategoryFormValues()).toStrictEqual({
      descriptions: EMPTY_MAP,
      handle: "",
      image: "",
      parentId: "",
      shortDescriptions: EMPTY_MAP,
      status: "draft",
      subtitles: EMPTY_MAP,
      titles: EMPTY_MAP,
    })
  })

  it("hands out independent locale maps so two forms cannot share state", () => {
    const first = createDefaultCategoryFormValues()
    const second = createDefaultCategoryFormValues()

    expect(first.titles).not.toBe(second.titles)
    expect(first.descriptions).not.toBe(second.titles)
  })
})

describe("adminListItemToFormValues", () => {
  it("turns the nullable columns into the empty strings the inputs expect", () => {
    const values = adminListItemToFormValues(listItem({}))

    expect(values.image).toBe("")
    expect(values.parentId).toBe("")
    expect(values.descriptions).toStrictEqual(EMPTY_MAP)
    expect(values.shortDescriptions).toStrictEqual(EMPTY_MAP)
    expect(values.subtitles).toStrictEqual(EMPTY_MAP)
  })

  it("keeps the stored image and parent so editing does not detach the category", () => {
    const values = adminListItemToFormValues(listItem({ image: "categories/rings.jpg", parentId: "category-jewellery" }))

    expect(values.image).toBe("categories/rings.jpg")
    expect(values.parentId).toBe("category-jewellery")
  })

  it("fills a locale the stored maps are missing", () => {
    const values = adminListItemToFormValues(listItem({ subtitles: { "pl-PL": "Srebro" } }))

    expect(values.subtitles).toStrictEqual({ "en-US": "", "pl-PL": "Srebro" })
  })

  it("lifts a legacy single-string column into the default locale", () => {
    const values = adminListItemToFormValues(listItem({ descriptions: "Ręcznie robione" }))

    expect(values.descriptions).toStrictEqual({ "en-US": "", "pl-PL": "Ręcznie robione" })
  })

  it("carries the handle, status and titles through untouched", () => {
    const values = adminListItemToFormValues(listItem({ handle: "necklaces", status: "draft" }))

    expect(values.handle).toBe("necklaces")
    expect(values.status).toBe("draft")
    expect(values.titles).toStrictEqual({ "en-US": "Rings", "pl-PL": "Pierścionki" })
  })
})

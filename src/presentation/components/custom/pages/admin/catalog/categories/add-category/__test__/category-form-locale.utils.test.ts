import { describe, expect, it } from "vite-plus/test"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { localesWithIncompleteCategoryFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-locale.utils"

const EMPTY_MAP: ProductCategory["localeMap"] = { "en-US": "", "pl-PL": "" }

const formValues = (titles: ProductCategory["localeMap"]): ProductCategory["formValues"] => ({
  descriptions: EMPTY_MAP,
  handle: "rings",
  image: "",
  parentId: "",
  shortDescriptions: EMPTY_MAP,
  status: "draft",
  subtitles: EMPTY_MAP,
  titles,
})

describe("localesWithIncompleteCategoryFormValues", () => {
  it("reports nothing once both titles are filled", () => {
    const values = formValues({ "en-US": "Rings", "pl-PL": "Pierścionki" })

    expect(localesWithIncompleteCategoryFormValues(values)).toStrictEqual([])
  })

  it("reports only the locale whose title is blank", () => {
    const values = formValues({ "en-US": "", "pl-PL": "Pierścionki" })

    expect(localesWithIncompleteCategoryFormValues(values)).toStrictEqual(["en-US"])
  })

  it("treats a whitespace-only title as blank", () => {
    const values = formValues({ "en-US": "Rings", "pl-PL": "  \t " })

    expect(localesWithIncompleteCategoryFormValues(values)).toStrictEqual(["pl-PL"])
  })

  it("reports both locales in the configured order when neither title is filled", () => {
    const values = formValues(EMPTY_MAP)

    expect(localesWithIncompleteCategoryFormValues(values)).toStrictEqual(["pl-PL", "en-US"])
  })

  it("ignores the other locale maps of the form", () => {
    const values = { ...formValues({ "en-US": "Rings", "pl-PL": "Pierścionki" }), subtitles: EMPTY_MAP }

    expect(localesWithIncompleteCategoryFormValues(values)).toStrictEqual([])
  })
})

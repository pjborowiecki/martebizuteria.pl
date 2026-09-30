import { describe, expect, it } from "vite-plus/test"

import {
  CATEGORY_COLUMN_LENGTH,
  CATEGORY_FORM_VALIDATION_KEYS,
  CATEGORY_STATUS,
} from "~/src/modules/product-category/product-category.constants"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

const localeMap = (value: string) => ({ "en-US": value, "pl-PL": value })

const formValues = (overrides: Record<string, unknown> = {}) => ({
  descriptions: localeMap(""),
  handle: "silver-rings",
  image: "",
  parentId: "",
  shortDescriptions: localeMap(""),
  status: CATEGORY_STATUS.ACTIVE,
  subtitles: localeMap(""),
  titles: localeMap("Silver rings"),
  ...overrides,
})

const overLength = (length: number) => localeMap("x".repeat(length))

const firstIssue = (input: Record<string, unknown>) => {
  const result = productCategoryZodSchemas.formValues.safeParse(input)
  if (result.success) {
    throw new Error("expected the form to be rejected")
  }

  return result.error.issues[0]
}

describe("productCategoryZodSchemas.formValues", () => {
  it("accepts a complete category form", () => {
    expect(productCategoryZodSchemas.formValues.safeParse(formValues()).success).toBe(true)
  })

  it("trims the handle and the copy the admin typed", () => {
    const parsed = productCategoryZodSchemas.formValues.parse(
      formValues({ handle: "  silver-rings  ", titles: localeMap("  Silver rings  ") }),
    )

    expect(parsed.handle).toBe("silver-rings")
    expect(parsed.titles["en-US"]).toBe("Silver rings")
  })

  it("requires a handle", () => {
    expect(firstIssue(formValues({ handle: "   " }))?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.slugRequired)
  })

  it.each(["Silver Rings", "silver rings", "silver_rings", "-silver", "silver-", "silver--rings"])("rejects the handle %s", (handle) => {
    expect(firstIssue(formValues({ handle }))?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.slugInvalid)
  })

  it.each(["rings", "silver-rings", "silver-rings-925"])("accepts the handle %s", (handle) => {
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ handle })).success).toBe(true)
  })

  it("requires a title in every supported locale", () => {
    const issue = firstIssue(formValues({ titles: { "en-US": "Silver rings", "pl-PL": "  " } }))

    expect(issue?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.localeTitleRequired)
    expect(issue?.path).toStrictEqual(["titles", "pl-PL"])
  })

  it("reports the missing title locale by locale", () => {
    const result = productCategoryZodSchemas.formValues.safeParse(formValues({ titles: localeMap("") }))
    if (result.success) {
      throw new Error("expected the form to be rejected")
    }

    expect(result.error.issues.map((issue) => issue.path.join("."))).toStrictEqual(["titles.pl-PL", "titles.en-US"])
  })

  it("caps the subtitle at the column length with its own message", () => {
    const issue = firstIssue(formValues({ subtitles: overLength(CATEGORY_COLUMN_LENGTH.subtitle + 1) }))

    expect(issue?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.subtitleTooLong)
  })

  it("caps the short description at the column length with its own message", () => {
    const issue = firstIssue(formValues({ shortDescriptions: overLength(CATEGORY_COLUMN_LENGTH.shortDescription + 1) }))

    expect(issue?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.shortDescriptionTooLong)
  })

  it("caps the description at the column length with its own message", () => {
    const issue = firstIssue(formValues({ descriptions: overLength(CATEGORY_COLUMN_LENGTH.description + 1) }))

    expect(issue?.message).toBe(CATEGORY_FORM_VALIDATION_KEYS.descriptionTooLong)
  })

  it("accepts copy exactly at the column length", () => {
    const atLimit = formValues({ subtitles: overLength(CATEGORY_COLUMN_LENGTH.subtitle) })

    expect(productCategoryZodSchemas.formValues.safeParse(atLimit).success).toBe(true)
  })

  it("accepts an empty parent for a root category", () => {
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ parentId: "" })).success).toBe(true)
  })

  it("requires a real uuid when a parent is chosen", () => {
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ parentId: "not-a-uuid" })).success).toBe(false)
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ parentId: "3f4d1a5e-8f9c-4a3b-9d2e-1c2b3a4d5e6f" })).success).toBe(
      true,
    )
  })

  it("accepts only the supported statuses", () => {
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ status: "archived" })).success).toBe(false)
    expect(productCategoryZodSchemas.formValues.safeParse(formValues({ status: CATEGORY_STATUS.DRAFT })).success).toBe(true)
  })
})

describe("productCategoryZodSchemas.createInput", () => {
  it("defaults the image and the parent so a minimal payload is accepted", () => {
    const parsed = productCategoryZodSchemas.createInput.parse({
      descriptions: localeMap(""),
      handle: "silver-rings",
      shortDescriptions: localeMap(""),
      status: CATEGORY_STATUS.DRAFT,
      subtitles: localeMap(""),
      titles: localeMap("Silver rings"),
    })

    expect(parsed.image).toBe("")
    expect(parsed.parentId).toBe("")
  })

  it("still refuses a malformed handle", () => {
    expect(
      productCategoryZodSchemas.createInput.safeParse({
        descriptions: localeMap(""),
        handle: "Silver Rings",
        shortDescriptions: localeMap(""),
        status: CATEGORY_STATUS.DRAFT,
        subtitles: localeMap(""),
        titles: localeMap("Silver rings"),
      }).success,
    ).toBe(false)
  })
})

describe("productCategoryZodSchemas.updateInput", () => {
  it("requires the id of the category being edited", () => {
    expect(productCategoryZodSchemas.updateInput.safeParse(formValues()).success).toBe(false)
    expect(productCategoryZodSchemas.updateInput.safeParse({ ...formValues(), id: "category-1" }).success).toBe(true)
  })

  it("refuses a blank id", () => {
    expect(productCategoryZodSchemas.updateInput.safeParse({ ...formValues(), id: "   " }).success).toBe(false)
  })
})

describe("productCategoryZodSchemas.deleteInput and reorderInput", () => {
  it("need at least one id", () => {
    expect(productCategoryZodSchemas.deleteInput.safeParse([]).success).toBe(false)
    expect(productCategoryZodSchemas.reorderInput.safeParse([]).success).toBe(false)
  })

  it("accept a list of ids", () => {
    expect(productCategoryZodSchemas.deleteInput.parse(["category-1", "category-2"])).toStrictEqual(["category-1", "category-2"])
    expect(productCategoryZodSchemas.reorderInput.parse(["category-1"])).toStrictEqual(["category-1"])
  })
})

describe("productCategoryZodSchemas.stats", () => {
  it("requires every counter to be a number", () => {
    expect(productCategoryZodSchemas.stats.parse({ active: 3, avgProducts: 1.5, draft: 1, total: 4 })).toStrictEqual({
      active: 3,
      avgProducts: 1.5,
      draft: 1,
      total: 4,
    })
    expect(productCategoryZodSchemas.stats.safeParse({ active: "3", avgProducts: 1.5, draft: 1, total: 4 }).success).toBe(false)
  })
})

describe("productCategoryZodSchemas.adminListItem", () => {
  it("carries the product count and optional parent titles alongside the stored row", () => {
    const row = {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      descriptions: null,
      handle: "silver-rings",
      id: "category-1",
      image: null,
      metadata: null,
      parentId: null,
      productCount: 7,
      rank: 0,
      shortDescriptions: null,
      status: CATEGORY_STATUS.ACTIVE,
      subtitles: null,
      titles: localeMap("Silver rings"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    }

    expect(productCategoryZodSchemas.adminListItem.safeParse(row).success).toBe(true)
    expect(productCategoryZodSchemas.adminListItem.safeParse({ ...row, parentTitles: localeMap("Rings") }).success).toBe(true)
  })

  it("refuses a row without the product count", () => {
    expect(
      productCategoryZodSchemas.adminListItem.safeParse({
        createdAt: new Date(),
        handle: "silver-rings",
        id: "category-1",
        rank: 0,
        status: CATEGORY_STATUS.ACTIVE,
        titles: localeMap("Silver rings"),
        updatedAt: new Date(),
      }).success,
    ).toBe(false)
  })
})

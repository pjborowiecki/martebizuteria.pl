import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  COLLECTION_COLUMN_LENGTH,
  COLLECTION_FORM_VALIDATION_KEYS,
  COLLECTION_STATUS,
} from "~/src/modules/product-collection/product-collection.constants"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

const titles = { "en-US": "Nova", "pl-PL": "Nova" }

const descriptions = { "en-US": "Sculpted silver", "pl-PL": "Rzeźbione srebro" }

const shortDescriptions = { "en-US": "Silver, sculpted", "pl-PL": "Srebro, rzeźbione" }

const createInput = {
  descriptions,
  handle: "nova",
  image: "",
  shortDescriptions,
  status: COLLECTION_STATUS.DRAFT,
  titles,
}

const uuid = "8d5f2a1e-2c3b-4d5e-8f70-1a2b3c4d5e6f"

describe("collection create input", () => {
  it("accepts a complete collection", () => {
    expect(productCollectionZodSchemas.createInput.parse(createInput)).toStrictEqual(createInput)
  })

  it("defaults a missing image to an empty string", () => {
    const { image: _image, ...withoutImage } = createInput

    expect(productCollectionZodSchemas.createInput.parse(withoutImage).image).toBe("")
  })

  it("trims the handle", () => {
    expect(productCollectionZodSchemas.createInput.parse({ ...createInput, handle: "  nova-drop  " }).handle).toBe("nova-drop")
  })

  it.each(["", "   ", "Nova", "nova drop", "nova_drop", "-nova", "nova-", "nova--drop"])("rejects the handle %j", (handle) => {
    expect(productCollectionZodSchemas.createInput.safeParse({ ...createInput, handle }).success).toBe(false)
  })

  it.each([...I18N.SUPPORTED_LOCALES])("requires a %s title", (locale) => {
    const parsed = productCollectionZodSchemas.createInput.safeParse({ ...createInput, titles: { ...titles, [locale]: "  " } })

    expect(parsed.error?.issues).toStrictEqual([
      expect.objectContaining({
        message: COLLECTION_FORM_VALIDATION_KEYS.localeTitleRequired,
        path: ["titles", locale],
      }),
    ])
  })

  it("allows empty descriptions", () => {
    expect(productCollectionZodSchemas.createInput.safeParse({ ...createInput, descriptions: { "en-US": "", "pl-PL": "" } }).success).toBe(
      true,
    )
  })

  it("rejects a short description longer than the column allows", () => {
    const tooLong = { ...shortDescriptions, "en-US": "s".repeat(COLLECTION_COLUMN_LENGTH.shortDescription + 1) }

    expect(productCollectionZodSchemas.createInput.safeParse({ ...createInput, shortDescriptions: tooLong }).success).toBe(false)
  })

  it("rejects a description longer than the column allows", () => {
    const tooLong = { ...descriptions, "en-US": "d".repeat(COLLECTION_COLUMN_LENGTH.description + 1) }

    expect(productCollectionZodSchemas.createInput.safeParse({ ...createInput, descriptions: tooLong }).success).toBe(false)
  })

  it.each([COLLECTION_STATUS.DRAFT, COLLECTION_STATUS.ACTIVE])("accepts the status %s", (status) => {
    expect(productCollectionZodSchemas.createInput.parse({ ...createInput, status }).status).toBe(status)
  })

  it("rejects an unknown status", () => {
    expect(productCollectionZodSchemas.createInput.safeParse({ ...createInput, status: "archived" }).success).toBe(false)
  })
})

describe("productCollectionZodSchemas.formValues", () => {
  it("reports a blank handle as both required and malformed", () => {
    const parsed = productCollectionZodSchemas.formValues.safeParse({ ...createInput, handle: "" })

    expect(parsed.error?.issues.map((issue) => issue.message)).toStrictEqual([
      COLLECTION_FORM_VALIDATION_KEYS.slugRequired,
      COLLECTION_FORM_VALIDATION_KEYS.slugInvalid,
    ])
  })

  it("reports a malformed handle with the slug invalid key", () => {
    const parsed = productCollectionZodSchemas.formValues.safeParse({ ...createInput, handle: "Nova Drop" })

    expect(parsed.error?.issues.map((issue) => issue.message)).toStrictEqual([COLLECTION_FORM_VALIDATION_KEYS.slugInvalid])
  })

  it("reports an over-long description with the translation key the form shows", () => {
    const tooLong = { ...descriptions, "pl-PL": "d".repeat(COLLECTION_COLUMN_LENGTH.description + 1) }
    const parsed = productCollectionZodSchemas.formValues.safeParse({ ...createInput, descriptions: tooLong })

    expect(parsed.error?.issues).toStrictEqual([
      expect.objectContaining({
        message: COLLECTION_FORM_VALIDATION_KEYS.descriptionTooLong,
        path: ["descriptions", "pl-PL"],
      }),
    ])
  })

  it("reports an over-long short description with the translation key the form shows", () => {
    const tooLong = { ...shortDescriptions, "pl-PL": "s".repeat(COLLECTION_COLUMN_LENGTH.shortDescription + 1) }
    const parsed = productCollectionZodSchemas.formValues.safeParse({ ...createInput, shortDescriptions: tooLong })

    expect(parsed.error?.issues).toStrictEqual([
      expect.objectContaining({
        message: COLLECTION_FORM_VALIDATION_KEYS.shortDescriptionTooLong,
        path: ["shortDescriptions", "pl-PL"],
      }),
    ])
  })

  it("requires the image field instead of defaulting it", () => {
    const { image: _image, ...withoutImage } = createInput

    expect(productCollectionZodSchemas.formValues.safeParse(withoutImage).success).toBe(false)
  })
})

describe("collection update input", () => {
  it("requires a uuid id alongside the create fields", () => {
    expect(productCollectionZodSchemas.updateInput.parse({ ...createInput, id: uuid }).id).toBe(uuid)
    expect(productCollectionZodSchemas.updateInput.safeParse(createInput).success).toBe(false)
    expect(productCollectionZodSchemas.updateInput.safeParse({ ...createInput, id: "collection-1" }).success).toBe(false)
  })
})

describe("collection id list inputs", () => {
  it.each([
    ["deleteInput", productCollectionZodSchemas.deleteInput],
    ["reorderInput", productCollectionZodSchemas.reorderInput],
  ] as const)("%s requires at least one uuid", (_name, schema) => {
    expect(schema.safeParse([]).success).toBe(false)
    expect(schema.safeParse(["not-a-uuid"]).success).toBe(false)
    expect(schema.parse([uuid])).toStrictEqual([uuid])
  })
})

describe("collection handle input", () => {
  it("accepts a non-empty handle and rejects an empty one", () => {
    expect(productCollectionZodSchemas.handleInput.parse("nova")).toBe("nova")
    expect(productCollectionZodSchemas.handleInput.safeParse("").success).toBe(false)
  })
})

describe("collection stats", () => {
  it("requires all four counters as numbers", () => {
    const stats = { active: 2, avgProducts: 4.5, draft: 1, total: 3 }

    expect(productCollectionZodSchemas.stats.parse(stats)).toStrictEqual(stats)
    expect(productCollectionZodSchemas.stats.safeParse({ active: 2, avgProducts: 4.5, draft: 1 }).success).toBe(false)
  })
})

describe("collection admin list item", () => {
  const row = {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    descriptions,
    handle: "nova",
    id: uuid,
    image: null,
    metadata: null,
    productCount: 7,
    rank: 0,
    shortDescriptions,
    status: COLLECTION_STATUS.ACTIVE,
    titles,
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  }

  it("carries the product count through", () => {
    expect(productCollectionZodSchemas.adminListItem.parse(row).productCount).toBe(7)
  })

  it("rejects a non-numeric product count", () => {
    expect(productCollectionZodSchemas.adminListItem.safeParse({ ...row, productCount: "7" }).success).toBe(false)
  })

  it("rejects a status outside the column enum", () => {
    expect(productCollectionZodSchemas.select.safeParse({ ...row, status: "archived" }).success).toBe(false)
  })
})

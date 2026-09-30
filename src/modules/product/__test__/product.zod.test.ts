import { describe, expect, it } from "vite-plus/test"

import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_COLUMN_LENGTH,
  PRODUCT_FORM_VALIDATION_KEYS,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_VARIANT_KIND,
} from "~/src/modules/product/product.constants"
import {
  type CatalogUpsertInput,
  type ProductFormValues,
  parseCatalogUpsertInput,
  productZodSchemas,
} from "~/src/modules/product/product.zod"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const PRIMARY_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000001"

const OPTION_ID = "0195b6f4-0000-7000-8000-000000000011"

const VARIANT_ID = "0195b6f4-0000-7000-8000-000000000021"

interface Issue {
  readonly message: string
  readonly path: string
}

const catalogInput = (overrides: Partial<CatalogUpsertInput> = {}): CatalogUpsertInput => ({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: locales(""),
  handle: "srebrny-pierscionek",
  hasVariants: false,
  options: [],
  primaryCategoryId: PRIMARY_CATEGORY_ID,
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: "" },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: locales(""),
  tags: { "en-US": [], "pl-PL": [] },
  titles: locales("Srebrny pierścionek", "Silver ring"),
  variants: [],
  ...overrides,
})

const sizeOption: CatalogUpsertInput["options"][number] = {
  id: OPTION_ID,
  titles: locales("Rozmiar", "Size"),
  values: [{ labels: locales("S") }],
}

const variantRow = (overrides: Partial<CatalogUpsertInput["variants"][number]> = {}): CatalogUpsertInput["variants"][number] => ({
  compareAtPrice: "",
  manageInventory: true,
  optionValues: {},
  price: "150.00",
  quantity: 3,
  sku: "",
  ...overrides,
})

const formValues = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...catalogInput(),
  attributeValues: [],
  images: [],
  ...overrides,
})

const catalogIssues = (input: unknown): Issue[] => {
  const result = productZodSchemas.catalogUpsertInput.safeParse(input)
  if (result.success) {
    return []
  }

  return result.error.issues.map((issue) => ({ message: issue.message, path: issue.path.join(".") }))
}

const formIssues = (input: unknown): Issue[] => {
  const result = productZodSchemas.form.safeParse(input)
  if (result.success) {
    return []
  }

  return result.error.issues.map((issue) => ({ message: issue.message, path: issue.path.join(".") }))
}

describe("catalogUpsertInput handle and organization rules", () => {
  it("accepts a fully filled draft of a simple product", () => {
    expect(catalogIssues(catalogInput())).toStrictEqual([])
  })

  it("demands a primary category before the product may be saved", () => {
    expect(catalogIssues(catalogInput({ primaryCategoryId: "" }))).toContainEqual({
      message: PRODUCT_FORM_VALIDATION_KEYS.primaryCategoryRequired,
      path: "primaryCategoryId",
    })
  })

  it("rejects a handle that is not a lowercase slug", () => {
    expect(catalogIssues(catalogInput({ handle: "Srebrny Pierscionek" }))).toContainEqual({
      message: PRODUCT_FORM_VALIDATION_KEYS.slugInvalid,
      path: "handle",
    })
  })

  it("rejects an empty handle as missing rather than malformed", () => {
    const issues = catalogIssues(catalogInput({ handle: "   " }))

    expect(issues.map((issue) => issue.message)).toContain(PRODUCT_FORM_VALIDATION_KEYS.slugRequired)
  })

  it("rejects a handle longer than the database column", () => {
    const overlongHandle = "a".repeat(PRODUCT_COLUMN_LENGTH.handle + 1)

    expect(catalogIssues(catalogInput({ handle: overlongHandle }))).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.slugTooLong, path: "handle" },
    ])
  })

  it("demands a title in every supported locale", () => {
    const titles = locales("Srebrny pierścionek", "")

    expect(catalogIssues(catalogInput({ titles }))).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.localeTitleRequired, path: "titles.en-US" },
    ])
  })

  it("rejects a subtitle longer than the database column", () => {
    const tooLong = "a".repeat(PRODUCT_COLUMN_LENGTH.subtitle + 1)
    const issues = catalogIssues(catalogInput({ subtitles: locales(tooLong, tooLong) }))

    expect(issues.map((issue) => issue.path)).toStrictEqual(["subtitles.pl-PL", "subtitles.en-US"])
  })
})

describe("catalogUpsertInput pricing of a simple product", () => {
  it("flags a simple product submitted without its only variant", () => {
    const { simpleVariant: _simpleVariant, ...withoutSimpleVariant } = catalogInput()

    expect(catalogIssues(withoutSimpleVariant)).toContainEqual({
      message: PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired,
      path: "simpleVariant",
    })
  })

  it("asks only for the missing variant when an active simple product arrives without one", () => {
    const { simpleVariant: _simpleVariant, ...withoutSimpleVariant } = catalogInput({ status: PRODUCT_ADMIN_STATUS.ACTIVE })

    expect(catalogIssues(withoutSimpleVariant)).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired, path: "simpleVariant" },
    ])
  })

  it("rejects a price it cannot parse as money", () => {
    const issues = catalogIssues(
      catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "12,,5", quantity: 1, sku: "" } }),
    )

    expect(issues).toContainEqual({ message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid, path: "simpleVariant.price" })
  })

  it("rejects a blank price as below the store minimum", () => {
    const issues = catalogIssues(
      catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "", quantity: 1, sku: "" } }),
    )

    expect(issues).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.priceRequired, path: "simpleVariant.price" }])
  })

  it("accepts a price exactly at the store minimum", () => {
    const issues = catalogIssues(
      catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "2.00", quantity: 1, sku: "" } }),
    )

    expect(issues).toStrictEqual([])
  })

  it("rejects a compare-at price below the sell price once the product is active", () => {
    const issues = catalogIssues(
      catalogInput({
        simpleVariant: { compareAtPrice: "100.00", manageInventory: true, price: "120.00", quantity: 1, sku: "" },
        status: PRODUCT_ADMIN_STATUS.ACTIVE,
      }),
    )

    expect(issues).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid, path: "simpleVariant.compareAtPrice" }])
  })

  it("leaves the compare-at price alone while the product is still a draft", () => {
    const issues = catalogIssues(
      catalogInput({
        simpleVariant: { compareAtPrice: "100.00", manageInventory: true, price: "120.00", quantity: 1, sku: "" },
        status: PRODUCT_ADMIN_STATUS.DRAFT,
      }),
    )

    expect(issues).toStrictEqual([])
  })

  it("rejects a negative stock quantity", () => {
    const issues = catalogIssues(
      catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: -1, sku: "" } }),
    )

    expect(issues.map((issue) => issue.path)).toStrictEqual(["simpleVariant.quantity"])
  })
})

describe("catalogUpsertInput pricing of a variant product", () => {
  it("requires both an option and a variant row", () => {
    const issues = catalogIssues(catalogInput({ hasVariants: true }))

    expect(issues).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.optionsRequired, path: "options" },
      { message: PRODUCT_FORM_VALIDATION_KEYS.variantsRequired, path: "variants" },
    ])
  })

  it("accepts a priced active variant product", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [sizeOption],
        status: PRODUCT_ADMIN_STATUS.ACTIVE,
        variants: [variantRow({ id: VARIANT_ID })],
      }),
    )

    expect(issues).toStrictEqual([])
  })

  it("rejects an active catalog with an option combination that has no submitted variant price", () => {
    const input = catalogInput({
      hasVariants: true,
      options: [{ ...sizeOption, values: [{ labels: locales("S") }, { labels: locales("M") }] }],
      status: PRODUCT_ADMIN_STATUS.ACTIVE,
      variants: [variantRow({ optionValues: { [OPTION_ID]: "S" } })],
    })

    expect(catalogIssues(input)).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.variantCombinationsRequired, path: "variants" }])
  })

  it("requires all combinations of multiple options in the active product form", () => {
    const values = formValues({
      hasVariants: true,
      options: [
        { ...sizeOption, values: [{ labels: locales("S") }, { labels: locales("M") }] },
        { titles: locales("Kolor", "Color"), values: [{ labels: locales("Złoty", "Gold") }, { labels: locales("Srebrny", "Silver") }] },
      ],
      status: PRODUCT_ADMIN_STATUS.ACTIVE,
      variants: [variantRow(), variantRow()],
    })

    expect(formIssues(values)).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.variantCombinationsRequired, path: "variants" }])
    expect(formIssues({ ...values, variants: [variantRow(), variantRow(), variantRow(), variantRow()] })).toStrictEqual([])
  })

  it("uses normalized option values when counting the active product's required variants", () => {
    const input = catalogInput({
      hasVariants: true,
      options: [{ ...sizeOption, values: [{ labels: locales("S") }, { labels: locales(" S ") }] }],
      status: PRODUCT_ADMIN_STATUS.ACTIVE,
      variants: [variantRow()],
    })

    expect(catalogIssues(input)).toStrictEqual([])
  })

  it("allows an incomplete set of variant rows while the product is a draft", () => {
    const input = catalogInput({
      hasVariants: true,
      options: [{ ...sizeOption, values: [{ labels: locales("S") }, { labels: locales("M") }] }],
      variants: [variantRow()],
    })

    expect(catalogIssues(input)).toStrictEqual([])
  })

  it("names the offending row index when an active variant is priced below the minimum", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [sizeOption],
        status: PRODUCT_ADMIN_STATUS.ACTIVE,
        variants: [variantRow(), variantRow({ price: "1.00" })],
      }),
    )

    expect(issues).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.activePriceRequired, path: "variants.1.price" }])
  })

  it("reports an unparsable active variant price as both invalid and uncomparable", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [sizeOption],
        status: PRODUCT_ADMIN_STATUS.ACTIVE,
        variants: [variantRow({ compareAtPrice: "200.00", price: "12,,5" })],
      }),
    )

    expect(issues).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid, path: "variants.0.price" },
      { message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid, path: "variants.0.price" },
      { message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid, path: "variants.0.compareAtPrice" },
    ])
  })

  it("ignores an underpriced variant row while the product is a draft", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [sizeOption],
        variants: [variantRow({ price: "1.00" })],
      }),
    )

    expect(issues).toStrictEqual([])
  })

  it("demands an option label in every supported locale", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [{ id: OPTION_ID, titles: locales("Rozmiar", "Size"), values: [{ labels: locales("S", "") }] }],
        variants: [variantRow()],
      }),
    )

    expect(issues).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.localeTitleRequired, path: "options.0.values.0.labels.en-US" }])
  })

  it("rejects an option carrying no values at all", () => {
    const issues = catalogIssues(
      catalogInput({
        hasVariants: true,
        options: [{ id: OPTION_ID, titles: locales("Rozmiar", "Size"), values: [] }],
        variants: [variantRow()],
      }),
    )

    expect(issues.map((issue) => issue.path)).toStrictEqual(["options.0.values"])
  })
})

describe("productZodSchemas.form duplicate detection", () => {
  it("flags both variant rows that share a SKU", () => {
    const issues = formIssues(
      formValues({
        hasVariants: true,
        options: [sizeOption],
        variants: [variantRow({ sku: "SR-1" }), variantRow({ sku: " SR-1 " })],
      }),
    )

    expect(issues).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.duplicateSku, path: "variants.0.sku" },
      { message: PRODUCT_FORM_VALIDATION_KEYS.duplicateSku, path: "variants.1.sku" },
    ])
  })

  it("accepts variant rows with distinct SKUs", () => {
    const issues = formIssues(
      formValues({
        hasVariants: true,
        options: [sizeOption],
        variants: [variantRow({ sku: "SR-1" }), variantRow({ sku: "SR-2" })],
      }),
    )

    expect(issues).toStrictEqual([])
  })

  it("flags only the later row when an attribute is repeated", () => {
    const issues = formIssues(
      formValues({
        attributeValues: [
          { attributeId: "material", value: "silver" },
          { attributeId: "material", value: "gold" },
        ],
      }),
    )

    expect(issues).toStrictEqual([{ message: PRODUCT_FORM_VALIDATION_KEYS.duplicateAttribute, path: "attributeValues.1.attributeId" }])
  })

  it("ignores blank attribute rows when looking for duplicates", () => {
    const issues = formIssues(
      formValues({
        attributeValues: [
          { attributeId: "", value: "" },
          { attributeId: "", value: "" },
        ],
      }),
    )

    expect(issues).toStrictEqual([])
  })

  it("uses the form specific message for an over-long description", () => {
    const tooLong = "a".repeat(PRODUCT_COLUMN_LENGTH.description + 1)
    const overlong = locales(tooLong, tooLong)

    expect(formIssues(formValues({ descriptions: overlong }))).toStrictEqual([
      { message: PRODUCT_FORM_VALIDATION_KEYS.descriptionTooLong, path: "descriptions.pl-PL" },
      { message: PRODUCT_FORM_VALIDATION_KEYS.descriptionTooLong, path: "descriptions.en-US" },
    ])
  })

  it("uses the form specific message for an over-long subtitle", () => {
    const tooLong = "a".repeat(PRODUCT_COLUMN_LENGTH.subtitle + 1)
    const issues = formIssues(formValues({ subtitles: locales(tooLong, tooLong) }))

    expect(issues.map((issue) => issue.message)).toStrictEqual([
      PRODUCT_FORM_VALIDATION_KEYS.subtitleTooLong,
      PRODUCT_FORM_VALIDATION_KEYS.subtitleTooLong,
    ])
  })
})

describe("parseCatalogUpsertInput", () => {
  it("strips the media only fields from the product and from every variant", () => {
    const parsed = parseCatalogUpsertInput(
      formValues({
        attributeValues: [{ attributeId: "material", value: "silver" }],
        hasVariants: true,
        images: [{ alt: "", id: "img-1", url: "https://example.test/a.jpg" }],
        mainImageId: "img-1",
        options: [sizeOption],
        variants: [
          variantRow({
            attributeValues: [{ attributeId: "material", value: "gold" }],
            id: VARIANT_ID,
            images: [{ alt: "", id: "img-2", url: "https://example.test/b.jpg" }],
            mainImageId: "img-2",
          }),
        ],
      }),
    )

    expect(Object.keys(parsed)).not.toContain("images")
    expect(Object.keys(parsed)).not.toContain("attributeValues")
    expect(Object.keys(parsed)).not.toContain("mainImageId")
    expect(Object.keys(parsed.variants[0] ?? {}).toSorted()).toStrictEqual([
      "compareAtPrice",
      "id",
      "manageInventory",
      "optionValues",
      "price",
      "quantity",
      "sku",
    ])
  })

  it("forces inventory tracking on regardless of what the form submitted", () => {
    const parsed = parseCatalogUpsertInput(
      formValues({
        hasVariants: true,
        options: [sizeOption],
        variants: [variantRow({ manageInventory: false })],
      }),
    )

    expect(parsed.variants.map((row) => row.manageInventory)).toStrictEqual([true])
  })

  it("forces inventory tracking on the single variant of a simple product", () => {
    const parsed = parseCatalogUpsertInput(
      formValues({ simpleVariant: { compareAtPrice: "", manageInventory: false, price: "120.00", quantity: 5, sku: "" } }),
    )

    expect(parsed.simpleVariant?.manageInventory).toBe(true)
  })

  it("keeps the simple variant absent instead of inventing one", () => {
    const { simpleVariant: _simpleVariant, ...withoutSimpleVariant } = formValues({
      hasVariants: true,
      options: [sizeOption],
      variants: [variantRow()],
    })

    expect(parseCatalogUpsertInput(withoutSimpleVariant).simpleVariant).toBeUndefined()
  })

  it("throws when the form values do not satisfy the catalog schema", () => {
    expect(() => parseCatalogUpsertInput(formValues({ handle: "NOT A SLUG" }))).toThrow()
  })

  it("trims the handle and the SKU it hands to the database layer", () => {
    const parsed = parseCatalogUpsertInput(
      formValues({
        handle: "  srebrny-pierscionek  ",
        simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: "  SR-1  " },
      }),
    )

    expect(parsed.handle).toBe("srebrny-pierscionek")
    expect(parsed.simpleVariant?.sku).toBe("SR-1")
  })
})

describe("adminProductsPageInput", () => {
  it("accepts a page request with no filters", () => {
    expect(productZodSchemas.adminProductsPageInput.safeParse({}).success).toBe(true)
  })

  it("keeps the paging numbers it was given", () => {
    const parsed = productZodSchemas.adminProductsPageInput.parse({ page: 3, pageSize: 25 })

    expect(parsed).toStrictEqual({ page: 3, pageSize: 25 })
  })

  it("rejects a page number below the first page", () => {
    expect(productZodSchemas.adminProductsPageInput.safeParse({ page: 0 }).success).toBe(false)
  })

  it("accepts every inventory level the admin table can filter by", () => {
    const levels = [PRODUCT_INVENTORY_LEVEL.LOW, PRODUCT_INVENTORY_LEVEL.OK, PRODUCT_INVENTORY_LEVEL.OUT]

    expect(levels.every((level) => productZodSchemas.adminProductsPageInput.safeParse({ inventoryLevel: level }).success)).toBe(true)
  })

  it("rejects an inventory level it does not know", () => {
    expect(productZodSchemas.adminProductsPageInput.safeParse({ inventoryLevel: "plenty" }).success).toBe(false)
  })

  it("accepts both variant kinds and refuses anything else", () => {
    expect(productZodSchemas.adminProductsPageInput.safeParse({ variantKind: PRODUCT_VARIANT_KIND.MULTI }).success).toBe(true)
    expect(productZodSchemas.adminProductsPageInput.safeParse({ variantKind: "many" }).success).toBe(false)
  })

  it("keeps a numeric column filter that carries a recognised operator and amount", () => {
    const parsed = productZodSchemas.adminProductsPageInput.parse({ minPrice: { amountMinorUnits: 10_000, operator: "gte" } })

    expect(parsed.minPrice).toStrictEqual({ amountMinorUnits: 10_000, operator: "gte" })
  })

  it("rejects a numeric column filter that names an operator but no amount", () => {
    expect(productZodSchemas.adminProductsPageInput.safeParse({ minPrice: { operator: "gte" } }).success).toBe(false)
  })
})

describe("deleteInput and reorderInput", () => {
  it("refuses an empty list of product ids", () => {
    expect(productZodSchemas.deleteInput.safeParse([]).success).toBe(false)
    expect(productZodSchemas.reorderInput.safeParse([]).success).toBe(false)
  })

  it("trims the ids it accepts", () => {
    expect(productZodSchemas.deleteInput.parse([" abc "])).toStrictEqual(["abc"])
  })

  it("refuses a blank id", () => {
    expect(productZodSchemas.reorderInput.safeParse(["   "]).success).toBe(false)
  })
})

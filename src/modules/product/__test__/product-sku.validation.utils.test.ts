import { describe, expect, it } from "vite-plus/test"

import {
  collectProductFormSkuEntries,
  collectSkusFromCatalogInput,
  formPathToZodPath,
} from "~/src/modules/product/product-sku.validation.utils"
import { PRODUCT_ADMIN_STATUS } from "~/src/modules/product/product.constants"
import { type CatalogUpsertInput, type ProductFormValues } from "~/src/modules/product/product.zod"

const locales = { "en-US": "", "pl-PL": "" }

const variantRow = (sku: string): ProductFormValues["variants"][number] => ({
  compareAtPrice: "",
  manageInventory: true,
  optionValues: {},
  price: "100.00",
  quantity: 1,
  sku,
})

const catalogInput = (overrides: Partial<CatalogUpsertInput>): CatalogUpsertInput => ({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: locales,
  handle: "srebrny-pierscionek",
  hasVariants: false,
  options: [],
  primaryCategoryId: "",
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "100.00", quantity: 1, sku: "" },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: locales,
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
  ...overrides,
})

const formValues = (overrides: Partial<ProductFormValues>): ProductFormValues => ({
  ...catalogInput({}),
  attributeValues: [],
  images: [],
  ...overrides,
})

describe("formPathToZodPath", () => {
  it("maps the simple variant field", () => {
    expect(formPathToZodPath("simpleVariant.sku")).toStrictEqual(["simpleVariant", "sku"])
  })

  it("maps an indexed variant field to a numeric path segment", () => {
    expect(formPathToZodPath("variants.3.sku")).toStrictEqual(["variants", 3, "sku"])
    expect(formPathToZodPath("variants.0.sku")).toStrictEqual(["variants", 0, "sku"])
  })

  it("maps a path that names no whole variant index to no field at all", () => {
    expect(formPathToZodPath("variants.1.5.sku")).toStrictEqual([])
  })
})

describe("collectProductFormSkuEntries", () => {
  it("collects the single SKU of a simple product", () => {
    const values = formValues({
      hasVariants: false,
      simpleVariant: { compareAtPrice: "", manageInventory: true, price: "100.00", quantity: 1, sku: " SR-1 " },
    })

    expect(collectProductFormSkuEntries(values)).toStrictEqual([{ formPath: "simpleVariant.sku", sku: "SR-1" }])
  })

  it("collects nothing when a simple product has no SKU", () => {
    expect(collectProductFormSkuEntries(formValues({ hasVariants: false }))).toStrictEqual([])
    expect(collectProductFormSkuEntries(formValues({ hasVariants: false, simpleVariant: undefined }))).toStrictEqual([])
  })

  it("ignores the simple variant SKU once the product has variants", () => {
    const values = formValues({
      hasVariants: true,
      simpleVariant: { compareAtPrice: "", manageInventory: true, price: "100.00", quantity: 1, sku: "SR-1" },
      variants: [variantRow("SR-S")],
    })

    expect(collectProductFormSkuEntries(values)).toStrictEqual([{ formPath: "variants.0.sku", sku: "SR-S" }])
  })

  it("keeps the original index of each variant so the error lands on the right row", () => {
    const values = formValues({ hasVariants: true, variants: [variantRow("  "), variantRow("SR-L"), variantRow(" SR-M ")] })

    expect(collectProductFormSkuEntries(values)).toStrictEqual([
      { formPath: "variants.1.sku", sku: "SR-L" },
      { formPath: "variants.2.sku", sku: "SR-M" },
    ])
  })

  it("maps every collected form path back to a zod path", () => {
    const entries = collectProductFormSkuEntries(formValues({ hasVariants: true, variants: [variantRow("SR-S")] }))

    expect(entries.map((entry) => formPathToZodPath(entry.formPath))).toStrictEqual([["variants", 0, "sku"]])
  })
})

describe("collectSkusFromCatalogInput", () => {
  it("collects the trimmed SKU of a simple product", () => {
    const input = catalogInput({
      simpleVariant: { compareAtPrice: "", manageInventory: true, price: "100.00", quantity: 1, sku: " SR-1 " },
    })

    expect(collectSkusFromCatalogInput(input)).toStrictEqual(["SR-1"])
  })

  it("collects nothing when a simple product has no SKU", () => {
    expect(collectSkusFromCatalogInput(catalogInput({}))).toStrictEqual([])
    expect(collectSkusFromCatalogInput(catalogInput({ simpleVariant: undefined }))).toStrictEqual([])
  })

  it("collects every non-blank variant SKU", () => {
    const input = catalogInput({ hasVariants: true, variants: [variantRow(" SR-S "), variantRow("  ")] })

    expect(collectSkusFromCatalogInput(input)).toStrictEqual(["SR-S"])
  })

  it("keeps duplicates so the caller can reject them", () => {
    const input = catalogInput({ hasVariants: true, variants: [variantRow("SR-S"), variantRow("SR-S")] })

    expect(collectSkusFromCatalogInput(input)).toStrictEqual(["SR-S", "SR-S"])
  })
})

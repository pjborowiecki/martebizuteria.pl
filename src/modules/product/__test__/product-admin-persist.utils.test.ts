import { describe, expect, it } from "vite-plus/test"

import {
  buildAllProductImageRows,
  buildProductLevelAttributeRows,
  buildVariantAttributeGroups,
} from "~/src/modules/product/product-admin-persist.utils"
import { PRODUCT_ADMIN_STATUS } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const PRIMARY_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000001"

const FIRST_VARIANT_ID = "0195b6f4-0000-7000-8000-000000000021"

const SECOND_VARIANT_ID = "0195b6f4-0000-7000-8000-000000000022"

const MATERIAL_ID = "0195b6f4-0000-7000-8000-000000000031"

const WEIGHT_ID = "0195b6f4-0000-7000-8000-000000000032"

const formValues = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  additionalCategoryIds: [],
  attributeValues: [],
  collectionIds: [],
  descriptions: locales(""),
  handle: "srebrny-pierscionek",
  hasVariants: false,
  images: [],
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

const variantRow = (overrides: Partial<ProductFormValues["variants"][number]> = {}): ProductFormValues["variants"][number] => ({
  compareAtPrice: "",
  manageInventory: true,
  optionValues: {},
  price: "150.00",
  quantity: 3,
  sku: "",
  ...overrides,
})

describe("buildProductLevelAttributeRows", () => {
  it("ranks the surviving rows by their position after filtering", () => {
    const rows = buildProductLevelAttributeRows(
      formValues({
        attributeValues: [
          { attributeId: MATERIAL_ID, value: " silver " },
          { attributeId: "   ", value: "ignored" },
          { attributeId: WEIGHT_ID, value: "3g" },
        ],
      }),
    )

    expect(rows).toStrictEqual([
      { attributeId: MATERIAL_ID, id: undefined, rank: 0, value: "silver" },
      { attributeId: WEIGHT_ID, id: undefined, rank: 1, value: "3g" },
    ])
  })

  it("drops a row whose value is only whitespace", () => {
    const rows = buildProductLevelAttributeRows(formValues({ attributeValues: [{ attributeId: MATERIAL_ID, value: "   " }] }))

    expect(rows).toStrictEqual([])
  })

  it("keeps an existing row id so the row is updated rather than duplicated", () => {
    const rows = buildProductLevelAttributeRows(
      formValues({ attributeValues: [{ attributeId: MATERIAL_ID, id: "row-1", value: "silver" }] }),
    )

    expect(rows).toStrictEqual([{ attributeId: MATERIAL_ID, id: "row-1", rank: 0, value: "silver" }])
  })

  it("writes no product level attributes at all once the product has variants", () => {
    const rows = buildProductLevelAttributeRows(
      formValues({ attributeValues: [{ attributeId: MATERIAL_ID, value: "silver" }], hasVariants: true }),
    )

    expect(rows).toStrictEqual([])
  })
})

describe("buildVariantAttributeGroups", () => {
  it("groups the attribute rows under the variant they belong to", () => {
    const groups = buildVariantAttributeGroups(
      formValues({
        hasVariants: true,
        variants: [
          variantRow({ attributeValues: [{ attributeId: MATERIAL_ID, value: " silver " }], id: FIRST_VARIANT_ID }),
          variantRow({ attributeValues: [{ attributeId: WEIGHT_ID, value: "4g" }], id: SECOND_VARIANT_ID }),
        ],
      }),
    )

    expect(groups).toStrictEqual([
      { values: [{ attributeId: MATERIAL_ID, id: undefined, rank: 0, value: "silver" }], variantId: FIRST_VARIANT_ID },
      { values: [{ attributeId: WEIGHT_ID, id: undefined, rank: 0, value: "4g" }], variantId: SECOND_VARIANT_ID },
    ])
  })

  it("skips a variant that has not been persisted yet", () => {
    const groups = buildVariantAttributeGroups(
      formValues({
        hasVariants: true,
        variants: [variantRow({ attributeValues: [{ attributeId: MATERIAL_ID, value: "silver" }] })],
      }),
    )

    expect(groups).toStrictEqual([])
  })

  it("skips a persisted variant whose rows are all blank", () => {
    const groups = buildVariantAttributeGroups(
      formValues({
        hasVariants: true,
        variants: [
          variantRow({ attributeValues: [{ attributeId: "", value: "" }], id: FIRST_VARIANT_ID }),
          variantRow({ attributeValues: [{ attributeId: WEIGHT_ID, value: "4g" }], id: SECOND_VARIANT_ID }),
        ],
      }),
    )

    expect(groups.map((group) => group.variantId)).toStrictEqual([SECOND_VARIANT_ID])
  })

  it("skips a persisted variant that carries no attribute list at all", () => {
    const groups = buildVariantAttributeGroups(formValues({ hasVariants: true, variants: [variantRow({ id: FIRST_VARIANT_ID })] }))

    expect(groups).toStrictEqual([])
  })
})

describe("buildAllProductImageRows", () => {
  it("keeps shared images when a persisted variant has no image collection", () => {
    const rows = buildAllProductImageRows(
      formValues({
        images: [{ alt: "front", id: "img-1", url: "https://example.test/1.jpg" }],
        variants: [variantRow({ id: FIRST_VARIANT_ID })],
      }),
    )

    expect(rows).toStrictEqual([{ alt: "front", id: "img-1", rank: 0, url: "https://example.test/1.jpg", variantId: undefined }])
  })

  it("promotes the chosen main image to rank zero and keeps the rest in order", () => {
    const rows = buildAllProductImageRows(
      formValues({
        images: [
          { alt: "front", id: "img-1", url: "https://example.test/1.jpg" },
          { alt: "", id: "img-2", url: "https://example.test/2.jpg" },
          { alt: "side", id: "img-3", url: "https://example.test/3.jpg" },
        ],
        mainImageId: "img-3",
      }),
    )

    expect(rows.map((row) => [row.id, row.rank])).toStrictEqual([
      ["img-3", 0],
      ["img-1", 1],
      ["img-2", 2],
    ])
  })

  it("stores no alt text for an image whose alt was left blank", () => {
    const rows = buildAllProductImageRows(formValues({ images: [{ alt: "", id: "img-1", url: "https://example.test/1.jpg" }] }))

    expect(rows).toStrictEqual([{ alt: undefined, id: "img-1", rank: 0, url: "https://example.test/1.jpg", variantId: undefined }])
  })

  it("leaves the submitted order untouched when the main image is unknown", () => {
    const rows = buildAllProductImageRows(
      formValues({
        images: [
          { alt: "", id: "img-1", url: "https://example.test/1.jpg" },
          { alt: "", id: "img-2", url: "https://example.test/2.jpg" },
        ],
        mainImageId: "img-missing",
      }),
    )

    expect(rows.map((row) => row.id)).toStrictEqual(["img-1", "img-2"])
  })

  it("appends the variant images after the shared ones and tags them with the variant", () => {
    const rows = buildAllProductImageRows(
      formValues({
        hasVariants: true,
        images: [{ alt: "", id: "img-1", url: "https://example.test/1.jpg" }],
        variants: [
          variantRow({
            id: FIRST_VARIANT_ID,
            images: [
              { alt: "", id: "img-2", url: "https://example.test/2.jpg" },
              { alt: "", id: "img-3", url: "https://example.test/3.jpg" },
            ],
            mainImageId: "img-3",
          }),
        ],
      }),
    )

    expect(rows.map((row) => [row.id, row.rank, row.variantId])).toStrictEqual([
      ["img-1", 0, undefined],
      ["img-3", 0, FIRST_VARIANT_ID],
      ["img-2", 1, FIRST_VARIANT_ID],
    ])
  })

  it("ignores the images of a variant that has no id yet", () => {
    const rows = buildAllProductImageRows(
      formValues({
        hasVariants: true,
        variants: [variantRow({ images: [{ alt: "", id: "img-2", url: "https://example.test/2.jpg" }] })],
      }),
    )

    expect(rows).toStrictEqual([])
  })
})

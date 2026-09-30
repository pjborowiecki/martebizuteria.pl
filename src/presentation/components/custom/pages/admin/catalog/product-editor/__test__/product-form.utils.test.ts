import { describe, expect, it } from "vite-plus/test"

import { type ProductOptionDraft } from "~/src/modules/product-variant/product-variant.utils"
import { type AdminProductDetail } from "~/src/modules/product/product.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import {
  createEmptyProductFormValues,
  mapProductDetailToFormValues,
  regenerateVariantRows,
  toCatalogUpsertPayload,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const AT = new Date("2026-01-01T00:00:00.000Z")

const stamps = { createdAt: AT, updatedAt: AT } as const

type ProductOption = AdminProductDetail["options"][number]
type ProductVariant = AdminProductDetail["variants"][number]
type ProductImage = AdminProductDetail["images"][number]
type ProductAttributeRow = AdminProductDetail["attributes"][number]
type CategoryAssignment = AdminProductDetail["categories"][number]
type CollectionAssignment = AdminProductDetail["collections"][number]
type OptionValue = ProductOption["values"][number]

const image = (id: string, rank: number, variantId: string | null = null): ProductImage => ({
  alt: null,
  id,
  productId: "prod-1",
  rank,
  url: `https://cdn.test/${id}.webp`,
  variantId,
  ...stamps,
})

const optionValue = (id: string, label: string, rank: number): OptionValue => ({
  id,
  labels: { "en-US": label, "pl-PL": label },
  optionId: "option-1",
  rank,
  ...stamps,
})

const option = (values: readonly OptionValue[]): ProductOption => ({
  id: "option-1",
  productId: "prod-1",
  titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
  values: [...values],
  ...stamps,
})

const attributeRow = (id: string, variantId: string | null): ProductAttributeRow => ({
  attributeId: `attr-${id}`,
  id,
  productId: "prod-1",
  rank: 0,
  value: id,
  variantId,
  ...stamps,
})

const category = (id: string, isPrimary: boolean): CategoryAssignment => ({
  categoryId: id,
  isPrimary,
  productCategory: {
    descriptions: null,
    handle: id,
    id,
    image: null,
    metadata: null,
    parentId: null,
    rank: 0,
    shortDescriptions: null,
    status: "active",
    subtitles: null,
    titles: { "en-US": id, "pl-PL": id },
    ...stamps,
  },
  productId: "prod-1",
})

const collection = (id: string, rank: number): CollectionAssignment => ({
  collectionId: id,
  productCollection: {
    descriptions: null,
    handle: id,
    id,
    image: null,
    metadata: null,
    rank,
    status: "active",
    titles: { "en-US": id, "pl-PL": id },
    ...stamps,
  },
  productId: "prod-1",
  rank,
})

const variant = (
  overrides: Partial<Omit<ProductVariant, "attributes" | "images" | "inventory" | "optionOnVariants">> & {
    readonly id: string
    readonly title: string
    readonly valueId?: string
    readonly quantityAvailable?: number
    readonly images?: readonly ProductImage[]
    readonly attributes?: readonly ProductAttributeRow[]
  },
): ProductVariant => {
  const { attributes, images: variantImages, quantityAvailable, valueId, ...columns } = overrides
  const inventoryRow =
    quantityAvailable === undefined
      ? null
      : { id: `inv-${columns.id}`, quantityAvailable, quantityReserved: 0, variantId: columns.id, version: 1, ...stamps }
  const links =
    valueId === undefined
      ? []
      : [
          {
            id: `oov-${columns.id}`,
            option: option([]),
            optionId: "option-1",
            value: optionValue(valueId, "ignored", 0),
            valueId,
            variantId: columns.id,
            ...stamps,
          },
        ]

  return {
    attributes: attributes === undefined ? [] : [...attributes],
    barcode: null,
    compareAtPrice: null,
    images: variantImages === undefined ? [] : [...variantImages],
    inventory: inventoryRow,
    manageInventory: true,
    metadata: null,
    optionOnVariants: links,
    price: 12_000,
    productId: "prod-1",
    sku: null,
    ...stamps,
    ...columns,
  }
}

const detail = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  attributes: [],
  categories: [],
  collections: [],
  descriptions: null,
  handle: "gold-chain",
  id: "prod-1",
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  status: "draft",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Gold chain", "pl-PL": "Złoty łańcuszek" },
  variants: [],
  ...stamps,
  ...overrides,
})

const twoValueOption = option([optionValue("value-s", "S", 0), optionValue("value-m", "M", 1)])

const sizeOptionDraft: ProductOptionDraft = {
  id: "option-1",
  titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
  values: [
    { id: "value-s", labels: { "en-US": "S", "pl-PL": "S" } },
    { id: "value-m", labels: { "en-US": "M", "pl-PL": "M" } },
  ],
}

describe("createEmptyProductFormValues", () => {
  it("starts as a draft simple product with blank locale maps", () => {
    const values = createEmptyProductFormValues()

    expect(values.status).toBe("draft")
    expect(values.hasVariants).toBe(false)
    expect(values.titles).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(values.tags).toStrictEqual({ "en-US": [], "pl-PL": [] })
    expect(values.simpleVariant).toStrictEqual({ compareAtPrice: "", manageInventory: true, price: "", quantity: 0, sku: "" })
  })

  it("returns an independent object each call so editing one form cannot leak into another", () => {
    const first = createEmptyProductFormValues()
    first.titles["en-US"] = "Gold chain"

    expect(createEmptyProductFormValues().titles["en-US"]).toBe("")
  })
})

describe("mapProductDetailToFormValues for a simple product", () => {
  it("maps prices from minor units into money inputs", () => {
    const priced = variant({ compareAtPrice: 15_000, id: "var-1", price: 12_050, quantityAvailable: 7, sku: "GC-1", title: "Default" })
    const values = mapProductDetailToFormValues(detail({ variants: [priced] }))

    expect(values.hasVariants).toBe(false)
    expect(values.simpleVariant).toStrictEqual({
      compareAtPrice: "150.00",
      manageInventory: true,
      price: "120.50",
      quantity: 7,
      sku: "GC-1",
    })
    expect(values.variants).toStrictEqual([])
  })

  it("blanks a missing compare-at price and defaults missing inventory and sku", () => {
    const bare = variant({ id: "var-1", title: "Default" })
    const values = mapProductDetailToFormValues(detail({ variants: [bare] }))

    expect(values.simpleVariant?.compareAtPrice).toBe("")
    expect(values.simpleVariant?.quantity).toBe(0)
    expect(values.simpleVariant?.sku).toBe("")
  })

  it("falls back to the empty simple variant when the product has no variant row", () => {
    const empty = createEmptyProductFormValues()

    expect(mapProductDetailToFormValues(detail()).simpleVariant).toStrictEqual(empty.simpleVariant)
  })

  it("translates the stored status into the admin status", () => {
    expect(mapProductDetailToFormValues(detail({ status: "published" })).status).toBe("active")
    expect(mapProductDetailToFormValues(detail({ status: "archived" })).status).toBe("archived")
    expect(mapProductDetailToFormValues(detail({ status: "draft" })).status).toBe("draft")
  })

  it("coerces null locale maps into blank ones and a null tag map into empty lists", () => {
    const values = mapProductDetailToFormValues(detail())

    expect(values.descriptions).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(values.subtitles).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(values.tags).toStrictEqual({ "en-US": [], "pl-PL": [] })
  })

  it("keeps the stored tag map", () => {
    const tagged = detail({ tags: { "en-US": ["gift"], "pl-PL": ["prezent"] } })

    expect(mapProductDetailToFormValues(tagged).tags).toStrictEqual({ "en-US": ["gift"], "pl-PL": ["prezent"] })
  })
})

describe("mapProductDetailToFormValues organization relations", () => {
  it("splits the primary category out of the additional ones", () => {
    const product = detail({ categories: [category("cat-a", false), category("cat-b", true)] })
    const values = mapProductDetailToFormValues(product)

    expect(values.primaryCategoryId).toBe("cat-b")
    expect(values.additionalCategoryIds).toStrictEqual(["cat-a"])
  })

  it("treats the only assignment as primary when no row is flagged", () => {
    const product = detail({ categories: [category("cat-a", false)] })
    const values = mapProductDetailToFormValues(product)

    expect(values.primaryCategoryId).toBe("cat-a")
    expect(values.additionalCategoryIds).toStrictEqual([])
  })

  it("leaves the primary category empty when the product has none", () => {
    expect(mapProductDetailToFormValues(detail()).primaryCategoryId).toBe("")
  })

  it("carries the collection ids across in assignment order", () => {
    const product = detail({ collections: [collection("col-b", 0), collection("col-a", 1)] })

    expect(mapProductDetailToFormValues(product).collectionIds).toStrictEqual(["col-b", "col-a"])
  })

  it("keeps only product level attribute rows out of the variant ones", () => {
    const product = detail({ attributes: [attributeRow("a", null), attributeRow("b", "var-1")] })
    const values = mapProductDetailToFormValues(product)

    expect(values.attributeValues).toStrictEqual([{ attributeId: "attr-a", id: "a", rank: 0, value: "a" }])
  })
})

describe("mapProductDetailToFormValues images", () => {
  it("keeps only product level images, sorted by rank", () => {
    const product = detail({ images: [image("img-2", 2), { ...image("img-1", 1), alt: "front" }, image("img-3", 3, "var-1")] })
    const values = mapProductDetailToFormValues(product)

    expect(values.images).toStrictEqual([
      { alt: "front", id: "img-1", url: "https://cdn.test/img-1.webp" },
      { alt: "", id: "img-2", url: "https://cdn.test/img-2.webp" },
    ])
  })

  it("points the main image at the stored thumbnail", () => {
    const product = detail({ images: [image("img-1", 1), image("img-2", 2)], thumbnail: "https://cdn.test/img-2.webp" })

    expect(mapProductDetailToFormValues(product).mainImageId).toBe("img-2")
  })

  it("falls back to the lowest ranked image when the thumbnail no longer exists", () => {
    const product = detail({ images: [image("img-2", 2), image("img-1", 1)], thumbnail: "https://cdn.test/gone.webp" })

    expect(mapProductDetailToFormValues(product).mainImageId).toBe("img-1")
  })
})

describe("mapProductDetailToFormValues for a variant product", () => {
  const small = variant({ id: "var-s", price: 12_000, quantityAvailable: 5, sku: "GC-S", title: "S", valueId: "value-s" })
  const medium = variant({ id: "var-m", price: 13_000, quantityAvailable: 2, sku: "GC-M", title: "M", valueId: "value-m" })

  it("builds one form row per option value, matched to its variant by option value id", () => {
    const product = detail({ options: [twoValueOption], variants: [medium, small] })
    const values = mapProductDetailToFormValues(product)

    expect(values.hasVariants).toBe(true)
    expect(values.variants.map((row) => row.id)).toStrictEqual(["var-s", "var-m"])
    expect(values.variants.map((row) => row.sku)).toStrictEqual(["GC-S", "GC-M"])
    expect(values.variants.map((row) => row.price)).toStrictEqual(["120.00", "130.00"])
    expect(values.variants.map((row) => row.quantity)).toStrictEqual([5, 2])
    expect(values.variants.map((row) => row.optionValues)).toStrictEqual([{ "option-1": "value-s" }, { "option-1": "value-m" }])
    expect(values.variants.map((row) => row.title)).toStrictEqual(["S", "M"])
  })

  it("still fills the simple variant from the first stored variant so switching back to simple keeps a price", () => {
    const product = detail({ options: [twoValueOption], variants: [medium, small] })

    expect(mapProductDetailToFormValues(product).simpleVariant).toStrictEqual({
      compareAtPrice: "",
      manageInventory: true,
      price: "130.00",
      quantity: 2,
      sku: "GC-M",
    })
  })

  it("creates a blank row for an option value that has no variant yet", () => {
    const product = detail({ options: [twoValueOption], variants: [small] })
    const values = mapProductDetailToFormValues(product)

    expect(values.variants).toHaveLength(2)
    expect(values.variants[1]).toMatchObject({ compareAtPrice: "", price: "", quantity: 0, sku: "", title: "M" })
    expect(values.variants[1]?.id).not.toBe("var-s")
  })

  it("matches unlinked variants by title before considering their stored order", () => {
    const looseMedium = variant({ id: "var-m", price: 13_000, sku: "GC-M", title: " M " })
    const looseSmall = variant({ id: "var-s", price: 12_000, sku: "GC-S", title: "S" })
    const product = detail({ options: [twoValueOption], variants: [looseMedium, looseSmall] })

    expect(mapProductDetailToFormValues(product).variants.map((row) => row.sku)).toStrictEqual(["GC-S", "GC-M"])
  })

  it("reserves a title match so an earlier unmatched value cannot reuse its variant", () => {
    const looseMedium = variant({ id: "var-m", price: 13_000, sku: "GC-M", title: " M " })
    const product = detail({ options: [twoValueOption], variants: [looseMedium] })
    const values = mapProductDetailToFormValues(product)

    expect(values.variants[0]?.id).not.toBe("var-m")
    expect(values.variants[0]?.price).toBe("")
    expect(values.variants[1]).toMatchObject({ id: "var-m", price: "130.00", sku: "GC-M" })
    expect(values.variants.map((row) => row.optionValues)).toStrictEqual([{ "option-1": "value-s" }, { "option-1": "value-m" }])
  })

  it("reserves linked variants before title matches and positional fallbacks", () => {
    const linkedMedium = variant({ id: "var-m", price: 13_000, sku: "GC-M", title: "S", valueId: "value-m" })
    const product = detail({ options: [twoValueOption], variants: [linkedMedium] })
    const rows = mapProductDetailToFormValues(product).variants

    expect(rows[0]?.id).not.toBe("var-m")
    expect(rows[0]?.price).toBe("")
    expect(rows[1]).toMatchObject({ id: "var-m", price: "130.00", sku: "GC-M" })
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
  })

  it("assigns each unmatched legacy variant to at most one option value", () => {
    const product = detail({
      options: [twoValueOption],
      variants: [variant({ id: "legacy", price: 15_000, title: "Old name" })],
    })
    const rows = mapProductDetailToFormValues(product).variants

    expect(rows[0]).toMatchObject({ id: "legacy", price: "150.00", title: "S" })
    expect(rows[1]?.id).not.toBe("legacy")
    expect(rows[1]?.price).toBe("")
  })

  it("treats a single-value option and a single variant as a simple product", () => {
    const product = detail({ options: [option([optionValue("value-s", "S", 0)])], variants: [small] })
    const values = mapProductDetailToFormValues(product)

    expect(values.hasVariants).toBe(false)
    expect(values.options).toStrictEqual([])
    expect(values.variants).toStrictEqual([])
    expect(values.simpleVariant?.sku).toBe("GC-S")
  })

  it("keys an option value with no stored id by its label", () => {
    const unnamedOption = option([optionValue("", "S", 0), optionValue("", "M", 1)])
    const product = detail({
      options: [unnamedOption],
      variants: [variant({ id: "var-s", sku: "GC-S", title: "S" }), variant({ id: "var-m", sku: "GC-M", title: "M" })],
    })

    expect(mapProductDetailToFormValues(product).variants.map((row) => row.optionValues)).toStrictEqual([
      { "option-1": "S" },
      { "option-1": "M" },
    ])
  })

  it("keys an option value with neither an id nor a label by its position so the row survives", () => {
    const draftOption = option([optionValue("", "", 0), optionValue("", "M", 1)])
    const product = detail({
      options: [draftOption],
      variants: [variant({ id: "var-1", sku: "GC-1", title: "S" }), variant({ id: "var-2", sku: "GC-2", title: "M" })],
    })

    expect(mapProductDetailToFormValues(product).variants.map((row) => row.optionValues)).toStrictEqual([
      { "option-1": "__draft_0" },
      { "option-1": "M" },
    ])
  })

  it("treats more than one variant as a variant product even with no options stored", () => {
    const product = detail({ variants: [variant({ id: "var-1", title: "S" }), variant({ id: "var-2", title: "M" })] })
    const values = mapProductDetailToFormValues(product)

    expect(values.hasVariants).toBe(true)
    expect(values.options).toHaveLength(1)
    expect(values.options[0]?.titles).toStrictEqual({ "en-US": "Variant", "pl-PL": "Wariant" })
  })
})

describe("mapProductDetailToFormValues variant images and attributes", () => {
  const medium = variant({ id: "var-m", title: "M", valueId: "value-m" })

  it("preserves compare-at prices on individual variants", () => {
    const discounted = variant({ compareAtPrice: 15_000, id: "var-s", price: 12_000, title: "S", valueId: "value-s" })
    const values = mapProductDetailToFormValues(detail({ options: [twoValueOption], variants: [discounted, medium] }))

    expect(values.variants[0]).toMatchObject({ compareAtPrice: "150.00", price: "120.00" })
    expect(values.variants[1]).toMatchObject({ compareAtPrice: "", price: "120.00" })
  })

  it("prefers the variant's own images and makes the first one its main image", () => {
    const withImages = variant({
      id: "var-s",
      images: [{ ...image("vimg-1", 0, "var-s"), alt: "side" }, image("vimg-2", 1, "var-s")],
      title: "S",
      valueId: "value-s",
    })
    const product = detail({ options: [twoValueOption], variants: [withImages, medium] })
    const values = mapProductDetailToFormValues(product)

    expect(values.variants[0]?.images).toStrictEqual([
      { alt: "side", id: "vimg-1", url: "https://cdn.test/vimg-1.webp" },
      { alt: "", id: "vimg-2", url: "https://cdn.test/vimg-2.webp" },
    ])
    expect(values.variants[0]?.mainImageId).toBe("vimg-1")
    expect(values.variants[1]?.images).toStrictEqual([])
    expect(values.variants[1]?.mainImageId).toBeUndefined()
  })

  it("falls back to the product images tagged with the variant id, sorted by rank", () => {
    const product = detail({
      images: [image("img-late", 5, "var-s"), image("img-early", 1, "var-s")],
      options: [twoValueOption],
      variants: [variant({ id: "var-s", title: "S", valueId: "value-s" }), medium],
    })
    const rows = mapProductDetailToFormValues(product).variants

    expect(rows[0]?.images?.map((row) => row.id)).toStrictEqual(["img-early", "img-late"])
    expect(rows[0]?.mainImageId).toBe("img-early")
  })

  it("carries the variant's attribute rows onto its form row", () => {
    const withAttributes = variant({
      attributes: [{ ...attributeRow("row-1", "var-s"), rank: 3, value: "gold" }],
      id: "var-s",
      title: "S",
      valueId: "value-s",
    })
    const product = detail({ options: [twoValueOption], variants: [withAttributes, medium] })
    const rows = mapProductDetailToFormValues(product).variants

    expect(rows[0]?.attributeValues).toStrictEqual([{ attributeId: "attr-row-1", id: "row-1", rank: 3, value: "gold" }])
    expect(rows[1]?.attributeValues).toStrictEqual([])
  })
})

describe("regenerateVariantRows", () => {
  it("regenerates from a row the form registered before its option values existed", () => {
    const rows = regenerateVariantRows([sizeOptionDraft], [{ sku: "" }])

    expect(rows).toHaveLength(2)
    expect(rows[0]?.optionValues).toStrictEqual({ "option-1": "value-s" })
  })

  it("creates one blank row per option value when nothing existed", () => {
    const rows = regenerateVariantRows([sizeOptionDraft], [])

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.optionValues)).toStrictEqual([{ "option-1": "value-s" }, { "option-1": "value-m" }])
    expect(rows.map((row) => row.title)).toStrictEqual(["S", "M"])
    expect(rows.every((row) => row.price === "" && row.quantity === 0 && row.sku === "")).toBe(true)
  })

  it("issues a distinct id for every generated row", () => {
    const ids = regenerateVariantRows([sizeOptionDraft], []).map((row) => row.id)

    expect(new Set(ids).size).toBe(2)
  })

  it("reuses the existing row at the same position, keeping its pricing and stock", () => {
    const existing: ProductFormValues["variants"] = [
      {
        attributeValues: [{ attributeId: "attr-1", value: "gold" }],
        compareAtPrice: "150.00",
        id: "var-s",
        images: [{ alt: "front", id: "img-1", url: "https://cdn.test/img-1.webp" }],
        manageInventory: true,
        optionValues: { "option-1": "value-s" },
        price: "120.00",
        quantity: 4,
        sku: "GC-S",
      },
    ]
    const rows = regenerateVariantRows([sizeOptionDraft], existing)

    expect(rows[0]).toMatchObject({ compareAtPrice: "150.00", id: "var-s", price: "120.00", quantity: 4, sku: "GC-S" })
    expect(rows[0]?.mainImageId).toBe("img-1")
    expect(rows[0]?.attributeValues).toStrictEqual([{ attributeId: "attr-1", value: "gold" }])
    expect(rows[1]?.sku).toBe("")
  })

  it("keeps an explicit main image instead of inferring the first image", () => {
    const singleValueOption: ProductOptionDraft = {
      id: "option-1",
      titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
      values: [{ id: "value-s", labels: { "en-US": "S", "pl-PL": "S" } }],
    }
    const existing: ProductFormValues["variants"] = [
      {
        compareAtPrice: "",
        id: "var-s",
        images: [
          { alt: "", id: "img-1", url: "https://cdn.test/img-1.webp" },
          { alt: "", id: "img-2", url: "https://cdn.test/img-2.webp" },
        ],
        mainImageId: "img-2",
        manageInventory: true,
        optionValues: { "option-1": "value-s" },
        price: "",
        quantity: 0,
        sku: "",
      },
    ]

    expect(regenerateVariantRows([singleValueOption], existing)[0]?.mainImageId).toBe("img-2")
  })

  it("produces the cartesian product across two options", () => {
    const materialOption: ProductOptionDraft = {
      id: "option-2",
      titles: { "en-US": "Material", "pl-PL": "Materiał" },
      values: [
        { id: "value-gold", labels: { "en-US": "Gold", "pl-PL": "Złoto" } },
        { id: "value-silver", labels: { "en-US": "Silver", "pl-PL": "Srebro" } },
      ],
    }
    const rows = regenerateVariantRows([sizeOptionDraft, materialOption], [])

    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.optionValues)).toStrictEqual([
      { "option-1": "value-s", "option-2": "value-gold" },
      { "option-1": "value-s", "option-2": "value-silver" },
      { "option-1": "value-m", "option-2": "value-gold" },
      { "option-1": "value-m", "option-2": "value-silver" },
    ])
  })

  it("keeps a single default row when there are no options left", () => {
    const rows = regenerateVariantRows([], [])

    expect(rows).toHaveLength(1)
    expect(rows[0]?.optionValues).toStrictEqual({})
    expect(rows[0]?.title).toBe("Default")
  })

  it("keys an unlabelled draft value by its position so the row survives until it is named", () => {
    const draftOption: ProductOptionDraft = {
      id: "option-1",
      titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
      values: [{ labels: { "en-US": "", "pl-PL": "  " } }],
    }
    const rows = regenerateVariantRows([draftOption], [])

    expect(rows).toHaveLength(1)
    expect(rows[0]?.optionValues).toStrictEqual({ "option-1": "__draft_0" })
    expect(rows[0]?.title).toBe("__draft_0")
  })
})

describe("toCatalogUpsertPayload", () => {
  it("stamps the product id onto the submitted values", () => {
    const values = createEmptyProductFormValues()
    const payload = toCatalogUpsertPayload({ ...values, status: "active" }, "prod-9")

    expect(payload.id).toBe("prod-9")
    expect(payload.status).toBe("active")
    expect(payload.handle).toBe("")
  })

  it("leaves the rest of the submitted values untouched", () => {
    const values = createEmptyProductFormValues()
    const payload = toCatalogUpsertPayload({ ...values, handle: "gold-chain", primaryCategoryId: "cat-1" }, "prod-9")

    expect(payload.handle).toBe("gold-chain")
    expect(payload.primaryCategoryId).toBe("cat-1")
    expect(payload.variants).toStrictEqual([])
  })
})

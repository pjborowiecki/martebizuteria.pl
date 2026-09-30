import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { type PublishedProductByHandleRow, mapPublishedProductForStorefront } from "~/src/modules/product/product.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const NOW = new Date("2026-03-14T10:00:00.000Z")

const PRODUCT_ID = "prod-1"

const RINGS_ID = "cat-rings"

const GIFTS_ID = "cat-gifts"

const OPTION_ID = "opt-size"

const SMALL_ID = "val-s"

const LARGE_ID = "val-l"

type Row = PublishedProductByHandleRow

type AttributeRow = Row["attributes"][number]

type VariantRow = Row["variants"][number]

const attributeRow = (handle: string, value: string, variantId: string | null = null): AttributeRow => ({
  attributeId: `attr-${handle}`,
  createdAt: NOW,
  id: `aop-${handle}-${variantId ?? "product"}`,
  productAttribute: {
    allowedValues: null,
    createdAt: NOW,
    handle,
    id: `attr-${handle}`,
    rank: 0,
    titles: locales(handle),
    type: PRODUCT_ATTRIBUTE_TYPE.TEXT,
    unit: null,
    updatedAt: NOW,
  },
  productId: PRODUCT_ID,
  rank: 0,
  updatedAt: NOW,
  value,
  variantId,
})

const categoryRow = (categoryId: string, titles: readonly [string, string], isPrimary = false): Row["categories"][number] => ({
  categoryId,
  isPrimary,
  productCategory: {
    createdAt: NOW,
    descriptions: null,
    handle: categoryId,
    id: categoryId,
    image: null,
    metadata: null,
    parentId: null,
    rank: 0,
    shortDescriptions: null,
    status: "active",
    subtitles: null,
    titles: locales(titles[0], titles[1]),
    updatedAt: NOW,
  },
  productId: PRODUCT_ID,
})

const collectionRow = (collectionId: string): Row["collections"][number] => ({
  collectionId,
  productCollection: {
    createdAt: NOW,
    descriptions: null,
    handle: collectionId,
    id: collectionId,
    image: null,
    metadata: null,
    rank: 0,
    status: "active",
    titles: locales(collectionId),
    updatedAt: NOW,
  },
  productId: PRODUCT_ID,
  rank: 0,
})

const imageRow = (id: string, url: string, variantId: string | null = null): Row["images"][number] => ({
  alt: null,
  createdAt: NOW,
  id,
  productId: PRODUCT_ID,
  rank: 0,
  updatedAt: NOW,
  url,
  variantId,
})

const optionValue = (id: string, labels: readonly [string, string], rank: number) => ({
  createdAt: NOW,
  id,
  labels: locales(labels[0], labels[1]),
  optionId: OPTION_ID,
  rank,
  updatedAt: NOW,
})

const sizeOption = {
  createdAt: NOW,
  id: OPTION_ID,
  productId: PRODUCT_ID,
  titles: locales("Rozmiar", "Size"),
  updatedAt: NOW,
  values: [optionValue(SMALL_ID, ["S", "S"], 0), optionValue(LARGE_ID, ["L", "L"], 1)],
}

const variantRow = (id: string, overrides: Partial<VariantRow> = {}): VariantRow => ({
  attributes: [],
  barcode: null,
  compareAtPrice: null,
  createdAt: NOW,
  id,
  images: [],
  inventory: { createdAt: NOW, id: `inv-${id}`, quantityAvailable: 5, quantityReserved: 0, updatedAt: NOW, variantId: id, version: 1 },
  manageInventory: true,
  metadata: null,
  optionOnVariants: [],
  price: 12_000,
  productId: PRODUCT_ID,
  sku: null,
  title: "Default",
  updatedAt: NOW,
  ...overrides,
})

const publishedRow = (overrides: Partial<Row> = {}): Row => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: NOW,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: PRODUCT_ID,
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  status: PRODUCT_STATUS.PUBLISHED,
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: locales("Srebrny pierścionek", "Silver ring"),
  updatedAt: NOW,
  variants: [variantRow("var-1")],
  ...overrides,
})

describe("mapPublishedProductForStorefront copy", () => {
  it("resolves the title, subtitle and description in the requested locale", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ descriptions: locales("Opis", "Description"), subtitles: locales("Podtytuł", "Subtitle") }),
      "en-US",
    )

    expect(mapped.title).toBe("Silver ring")
    expect(mapped.subtitle).toBe("Subtitle")
    expect(mapped.description).toBe("Description")
  })

  it("falls back to the default locale for an unsupported one", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow(), "de-DE")

    expect(mapped.title).toBe("Srebrny pierścionek")
  })

  it("leaves the tags undefined rather than empty when the product carries none", () => {
    expect(mapPublishedProductForStorefront(publishedRow(), "en-US").tags).toBeUndefined()
  })

  it("resolves the tags of the requested locale", () => {
    const tags = { "en-US": ["silver", "gift"], "pl-PL": ["srebro"] }

    expect(mapPublishedProductForStorefront(publishedRow({ tags }), "en-US").tags).toStrictEqual(["silver", "gift"])
  })
})

describe("mapPublishedProductForStorefront organization", () => {
  it("uses the category the product row points at", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({
        categories: [categoryRow(GIFTS_ID, ["Prezenty", "Gifts"]), categoryRow(RINGS_ID, ["Pierścionki", "Rings"])],
        primaryCategoryId: RINGS_ID,
      }),
      "en-US",
    )

    expect(mapped.primaryCategoryId).toBe(RINGS_ID)
    expect(mapped.category?.id).toBe(RINGS_ID)
    expect(mapped.categoryId).toBe(RINGS_ID)
  })

  it("derives the primary category from the assignment flags when the row has none", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ categories: [categoryRow(GIFTS_ID, ["Prezenty", "Gifts"]), categoryRow(RINGS_ID, ["Pierścionki", "Rings"], true)] }),
      "en-US",
    )

    expect(mapped.primaryCategoryId).toBe(RINGS_ID)
  })

  it("falls back to the first assignment when nothing is flagged as primary", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ categories: [categoryRow(GIFTS_ID, ["Prezenty", "Gifts"]), categoryRow(RINGS_ID, ["Pierścionki", "Rings"])] }),
      "en-US",
    )

    expect(mapped.primaryCategoryId).toBe(GIFTS_ID)
  })

  it("reports no category at all for an unassigned product", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow(), "en-US")

    expect(mapped.category).toBeUndefined()
    expect(mapped.categoryId).toBeUndefined()
    expect(mapped.categories).toStrictEqual([])
  })

  it("exposes the first collection alongside the full list", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ collections: [collectionRow("col-new"), collectionRow("col-sale")] }),
      "en-US",
    )

    expect(mapped.collectionId).toBe("col-new")
    expect(mapped.collection?.id).toBe("col-new")
    expect(mapped.collections.map((entry) => entry.id)).toStrictEqual(["col-new", "col-sale"])
  })
})

describe("mapPublishedProductForStorefront images", () => {
  it("treats images with no variant as the shared gallery", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ images: [imageRow("img-1", "https://cdn.test/a.jpg"), imageRow("img-2", "https://cdn.test/b.jpg", "var-1")] }),
      "en-US",
    )

    expect(mapped.sharedImageUrls).toStrictEqual(["https://cdn.test/a.jpg"])
  })

  it("prefers the first variant's own images for the primary gallery", () => {
    const variantImage = imageRow("img-2", "https://cdn.test/variant.jpg", "var-1")
    const mapped = mapPublishedProductForStorefront(
      publishedRow({
        images: [imageRow("img-1", "https://cdn.test/shared.jpg")],
        variants: [variantRow("var-1", { images: [variantImage] })],
      }),
      "en-US",
    )

    expect(mapped.imageUrls).toStrictEqual(["https://cdn.test/variant.jpg"])
  })

  it("falls back to the shared gallery when no variant carries an image", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow({ images: [imageRow("img-1", "https://cdn.test/shared.jpg")] }), "en-US")

    expect(mapped.imageUrls).toStrictEqual(["https://cdn.test/shared.jpg"])
    expect(mapped.variants[0]?.imageUrls).toStrictEqual(["https://cdn.test/shared.jpg"])
  })

  it("keeps a variant scoped image out of the shared gallery but on its own variant", () => {
    const variantImage = imageRow("img-1", "https://cdn.test/variant.jpg", "var-1")
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ images: [variantImage], variants: [variantRow("var-1", { images: [variantImage] })] }),
      "en-US",
    )

    expect(mapped.sharedImageUrls).toStrictEqual([])
    expect(mapped.variants[0]?.imageUrls).toStrictEqual(["https://cdn.test/variant.jpg"])
  })

  it("leaves the gallery empty for a product with no images at all", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow(), "en-US")

    expect(mapped.imageUrls).toStrictEqual([])
    expect(mapped.sharedImageUrls).toStrictEqual([])
  })

  it("shows the shared gallery for a product that has no variant to borrow images from", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({
        images: [imageRow("img-1", "https://cdn.test/shared.jpg"), imageRow("img-2", "https://cdn.test/orphan.jpg", "var-gone")],
        variants: [],
      }),
      "en-US",
    )

    expect(mapped.imageUrls).toStrictEqual(["https://cdn.test/shared.jpg"])
    expect(mapped.sharedImageUrls).toStrictEqual(["https://cdn.test/shared.jpg"])
  })
})

describe("mapPublishedProductForStorefront specifications", () => {
  it("collects the product level attributes as the shared specifications", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow({ attributes: [attributeRow("material", "silver")] }), "en-US")

    expect(mapped.sharedSpecifications).toStrictEqual([
      {
        allowedValues: null,
        handle: "material",
        rank: 0,
        titles: locales("material"),
        type: PRODUCT_ATTRIBUTE_TYPE.TEXT,
        unit: null,
        value: "silver",
      },
    ])
  })

  it("ignores variant scoped attributes when building the shared specifications", () => {
    const mapped = mapPublishedProductForStorefront(
      publishedRow({ attributes: [attributeRow("material", "silver"), attributeRow("weight", "3g", "var-1")] }),
      "en-US",
    )

    expect(mapped.sharedSpecifications.map((entry) => entry.handle)).toStrictEqual(["material"])
  })

  it("prefers a variant's own specifications over the shared ones", () => {
    const variantAttribute = attributeRow("weight", "3g", "var-1")
    const mapped = mapPublishedProductForStorefront(
      publishedRow({
        attributes: [attributeRow("material", "silver")],
        variants: [variantRow("var-1", { attributes: [variantAttribute] })],
      }),
      "en-US",
    )

    expect(mapped.variants[0]?.specifications.map((entry) => entry.handle)).toStrictEqual(["weight"])
  })

  it("falls back to the shared specifications for a variant that declares none", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow({ attributes: [attributeRow("material", "silver")] }), "en-US")

    expect(mapped.variants[0]?.specifications.map((entry) => entry.handle)).toStrictEqual(["material"])
  })
})

describe("mapPublishedProductForStorefront options and variants", () => {
  it("localizes the option titles and value labels", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow({ options: [sizeOption] }), "en-US")

    expect(mapped.options).toStrictEqual([
      {
        id: OPTION_ID,
        title: "Size",
        values: [
          { id: SMALL_ID, label: "S" },
          { id: LARGE_ID, label: "L" },
        ],
      },
    ])
  })

  it("reports a single variant product with no options as having no variants", () => {
    expect(mapPublishedProductForStorefront(publishedRow(), "en-US").hasVariants).toBe(false)
  })

  it("reports a product with several variants as having variants", () => {
    const row = publishedRow({ variants: [variantRow("var-1"), variantRow("var-2")] })

    expect(mapPublishedProductForStorefront(row, "en-US").hasVariants).toBe(true)
  })

  it("reports a single variant product whose option offers several values as having variants", () => {
    const row = publishedRow({ options: [sizeOption] })

    expect(mapPublishedProductForStorefront(row, "en-US").hasVariants).toBe(true)
  })

  it("maps each variant's selected option values by option id", () => {
    const optionOnVariants = [
      {
        createdAt: NOW,
        id: "oov-1",
        option: { createdAt: NOW, id: OPTION_ID, productId: PRODUCT_ID, titles: locales("Rozmiar", "Size"), updatedAt: NOW },
        optionId: OPTION_ID,
        updatedAt: NOW,
        value: optionValue(SMALL_ID, ["S", "S"], 0),
        valueId: SMALL_ID,
        variantId: "var-1",
      },
    ]
    const mapped = mapPublishedProductForStorefront(publishedRow({ variants: [variantRow("var-1", { optionOnVariants })] }), "en-US")

    expect(mapped.variants[0]?.optionValueIds).toStrictEqual({ [OPTION_ID]: SMALL_ID })
  })

  it("leaves the option value map empty for a variant with no option rows", () => {
    expect(mapPublishedProductForStorefront(publishedRow(), "en-US").variants[0]?.optionValueIds).toStrictEqual({})
  })

  it("keeps the price and inventory of every variant it maps", () => {
    const mapped = mapPublishedProductForStorefront(publishedRow(), "en-US")

    expect(mapped.variants[0]?.price).toBe(12_000)
    expect(mapped.variants[0]?.inventory?.quantityAvailable).toBe(5)
  })
})

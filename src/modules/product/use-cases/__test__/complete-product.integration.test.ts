import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/admin/catalog/products") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve({ user: { role: ROLES.ADMIN } }),
}))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogProductCreatedAudit: vi.fn(),
  recordCatalogProductUpdatedAudit: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
}))

const { attributeOnProduct } = await import("~/src/modules/attribute-on-product/attribute-on-product.schema")
const { categoryOnProduct } = await import("~/src/modules/category-on-product/category-on-product.schema")
const { collectionOnProduct } = await import("~/src/modules/collection-on-product/collection-on-product.schema")
const { inventory } = await import("~/src/modules/inventory/inventory.schema")
const { optionOnVariant } = await import("~/src/modules/option-on-variant/option-on-variant.schema")
const { productAttribute } = await import("~/src/modules/product-attribute/product-attribute.schema")
const { productCategory } = await import("~/src/modules/product-category/product-category.schema")
const { productCollection } = await import("~/src/modules/product-collection/product-collection.schema")
const { productImage } = await import("~/src/modules/product-image/product-image.schema")
const { productOptionValue } = await import("~/src/modules/product-option-value/product-option-value.schema")
const { productOption } = await import("~/src/modules/product-option/product-option.schema")
const { productVariant } = await import("~/src/modules/product-variant/product-variant.schema")
const { product } = await import("~/src/modules/product/product.schema")
const { productZodSchemas } = await import("~/src/modules/product/product.zod")
const { createCompleteProduct } = await import("~/src/modules/product/use-cases/create-complete-product")
const { updateCompleteProduct } = await import("~/src/modules/product/use-cases/update-complete-product")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const TABLES = [
  productCategory,
  productCollection,
  productAttribute,
  product,
  productVariant,
  inventory,
  productOption,
  productOptionValue,
  optionOnVariant,
  categoryOnProduct,
  collectionOnProduct,
  productImage,
  attributeOnProduct,
]

const NOW = 1_770_000_000_000

const CATEGORY_ID = "01965030-0000-7000-8000-000000000001"

const ATTRIBUTE_COUNT = 25

const attributeId = (index: number): string => `01965030-0000-7000-8000-0000000001${String(index).padStart(2, "0")}`

const gallery = (size: number, prefix: string) =>
  Array.from({ length: size }, (_, rank) => ({ alt: `${prefix} view ${String(rank)}`, rank, url: `${prefix}-${String(rank)}.webp` }))

const attributeValues = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, offset) => ({ attributeId: attributeId(from + offset), value: `value ${String(from + offset)}` }))

const SIMPLE_VARIANT = { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: "SILVER-RING" }

const catalog = productZodSchemas.catalogUpsertInput.parse({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "silver-ring",
  hasVariants: false,
  options: [],
  primaryCategoryId: CATEGORY_ID,
  simpleVariant: SIMPLE_VARIANT,
  status: "draft",
  subtitles: { "en-US": "", "pl-PL": "" },
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
})

const createProduct = (details: { attributeValues: ReturnType<typeof attributeValues>; images: ReturnType<typeof gallery> }) =>
  createCompleteProduct({ data: { ...catalog, ...details } })

const column = (statement: string, name: string, ...params: string[]): unknown[] =>
  sqlite
    .prepare(statement)
    .all(...params)
    .map((row) => row[name])

const imageUrls = (productId: string): unknown[] =>
  column("select url from product_image where product_id = ? order by rank", "url", productId)

const attributeValuesOf = (productId: string): unknown[] =>
  column("select value from attribute_on_product where product_id = ? order by variant_id, rank", "value", productId)

const thumbnailOf = (productId: string): unknown => column("select thumbnail from product where id = ?", "thumbnail", productId)[0]

const englishTitleOf = (productId: string): unknown =>
  column(`select json_extract(titles, '$."en-US"') as title from product where id = ?`, "title", productId)[0]

const silenceFailureLog = () => vi.spyOn(console, "error").mockImplementation(() => {})

const variantIdOf = (productId: string): string => {
  const [id] = column("select id from product_variant where product_id = ?", "id", productId)
  if (typeof id !== "string") {
    throw new TypeError(`Product ${productId} has no variant`)
  }

  return id
}

beforeEach(() => {
  createTables(sqlite, TABLES)
  sqlite
    .prepare(
      `insert into product_category (id, handle, titles, status, rank, created_at, updated_at)
       values (?, 'rings', '{"en-US":"Rings"}', 'active', 0, ?, ?)`,
    )
    .run(CATEGORY_ID, NOW, NOW)
  const insertAttribute = sqlite.prepare(
    `insert into product_attribute (id, handle, titles, type, rank, created_at, updated_at) values (?, ?, '{"en-US":"A"}', 'text', ?, ?, ?)`,
  )
  for (let index = 0; index < ATTRIBUTE_COUNT; index++) {
    insertAttribute.run(attributeId(index), `attribute-${String(index)}`, index, NOW, NOW)
  }
})

afterAll(() => {
  sqlite.close()
})

describe("createCompleteProduct", () => {
  it("creates a product with a large gallery and many specifications in one save", async () => {
    const { id } = await createProduct({ attributeValues: attributeValues(0, ATTRIBUTE_COUNT), images: gallery(25, "front") })

    expect(imageUrls(id)).toStrictEqual(gallery(25, "front").map((image) => image.url))
    expect(thumbnailOf(id)).toBe("front-0.webp")
    expect(attributeValuesOf(id)).toHaveLength(ATTRIBUTE_COUNT)
    expect(column("select quantity_available from inventory", "quantity_available")).toStrictEqual([5])
  })

  it("leaves no partial product behind when the save fails", async () => {
    const log = silenceFailureLog()
    const images = [{ rank: 0, url: "front.webp", variantId: "no-such-variant" }]

    await expect(createCompleteProduct({ data: { ...catalog, attributeValues: [], images } })).rejects.toThrow("INTERNAL_ERROR")

    expect(log).toHaveBeenCalledOnce()

    expect(column("select id from product", "id")).toStrictEqual([])
    expect(column("select id from product_variant", "id")).toStrictEqual([])
  })
})

describe("updateCompleteProduct", () => {
  it("replaces a large gallery and the product and variant specifications in one save", async () => {
    const { id } = await createProduct({ attributeValues: attributeValues(0, 2), images: gallery(2, "old") })
    const variantId = variantIdOf(id)

    await updateCompleteProduct({
      data: {
        ...catalog,
        attributeValues: attributeValues(0, 13),
        id,
        images: gallery(25, "new"),
        simpleVariant: { ...SIMPLE_VARIANT, id: variantId },
        variantAttributeValues: [{ values: attributeValues(13, 25), variantId }],
      },
    })

    expect(imageUrls(id)).toStrictEqual(gallery(25, "new").map((image) => image.url))
    expect(thumbnailOf(id)).toBe("new-0.webp")
    expect(attributeValuesOf(id)).toHaveLength(ATTRIBUTE_COUNT)
    expect(variantIdOf(id)).toBe(variantId)
  })

  it("keeps the product exactly as it was when the save fails part way", async () => {
    const { id } = await createProduct({ attributeValues: attributeValues(0, 2), images: gallery(2, "kept") })
    const log = silenceFailureLog()

    await expect(
      updateCompleteProduct({
        data: {
          ...catalog,
          attributeValues: attributeValues(0, 5),
          id,
          images: [...gallery(3, "lost"), { rank: 3, url: "broken.webp", variantId: "no-such-variant" }],
          titles: { "en-US": "Renamed ring", "pl-PL": "Nowa nazwa" },
          variantAttributeValues: [],
        },
      }),
    ).rejects.toThrow("INTERNAL_ERROR")

    expect(log).toHaveBeenCalledOnce()
    expect(imageUrls(id)).toStrictEqual(["kept-0.webp", "kept-1.webp"])
    expect(thumbnailOf(id)).toBe("kept-0.webp")
    expect(attributeValuesOf(id)).toStrictEqual(["value 0", "value 1"])
    expect(englishTitleOf(id)).toBe(catalog.titles["en-US"])
  })
})

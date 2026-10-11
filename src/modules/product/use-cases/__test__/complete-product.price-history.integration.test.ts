import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
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
  getRequestSession: () => Promise.resolve({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } }),
}))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogProductCreatedAudit: vi.fn(),
  recordCatalogProductUpdatedAudit: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
}))

const { productZodSchemas } = await import("~/src/modules/product/product.zod")
const { createCompleteProduct } = await import("~/src/modules/product/use-cases/create-complete-product")
const { updateCompleteProduct } = await import("~/src/modules/product/use-cases/update-complete-product")

const CATEGORY_ID = "01965030-0000-7000-8000-000000000001"

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
  status: "active",
  subtitles: { "en-US": "", "pl-PL": "" },
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
})

const variantRowSchema = z.object({ id: z.string(), price: z.number(), productId: z.string() })

const variantOf = (productId: string) =>
  variantRowSchema.parse(
    sqlite.prepare("select id, price, product_id as productId from product_variant where product_id = ?").get(productId),
  )

const recordedPrices = (variantId: string): number[] =>
  z
    .array(z.object({ price: z.number() }))
    .parse(sqlite.prepare("select price from price_history where variant_id = ? order by id").all(variantId))
    .map((row) => row.price)

type ProductSave = Parameters<typeof updateCompleteProduct>[0]["data"]

interface SavedVariant {
  readonly id: string
  readonly productId: string
}

const saveSimpleVariant = (variant: SavedVariant, price: string, changes: Partial<ProductSave> = {}) =>
  updateCompleteProduct({
    data: {
      ...catalog,
      attributeValues: [],
      id: variant.productId,
      images: [],
      simpleVariant: { ...SIMPLE_VARIANT, id: variant.id, price },
      variantAttributeValues: [],
      ...changes,
    },
  })

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from product; delete from product_category;")
  sqlite
    .prepare(
      `insert into product_category (id, handle, titles, status, rank, created_at, updated_at)
       values (?, 'rings', '{"en-US":"Rings","pl-PL":"Pierścionki"}', 'active', 0, 0, 0)`,
    )
    .run(CATEGORY_ID)
})

afterAll(() => {
  sqlite.close()
})

describe("price history of a product saved in the admin product editor", () => {
  it("records the price a product is created with and each new price saved after it", async () => {
    const { id } = await createCompleteProduct({ data: { ...catalog, attributeValues: [], images: [] } })
    const variant = variantOf(id)

    await saveSimpleVariant(variant, "99")
    await saveSimpleVariant(variant, "99", { titles: { "en-US": "Polished silver ring", "pl-PL": "Polerowany pierścionek" } })

    expect(variantOf(id).price).toBe(9900)
    expect(recordedPrices(variant.id)).toStrictEqual([12_000, 9900])
  })

  it("records no price when the save that carried it fails part way", async () => {
    const { id } = await createCompleteProduct({ data: { ...catalog, attributeValues: [], images: [] } })
    const variant = variantOf(id)
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      saveSimpleVariant(variant, "80", { images: [{ rank: 0, url: "broken.webp", variantId: "no-such-variant" }] }),
    ).rejects.toThrow("INTERNAL_ERROR")

    expect(variantOf(id).price).toBe(12_000)
    expect(recordedPrices(variant.id)).toStrictEqual([12_000])
  })
})

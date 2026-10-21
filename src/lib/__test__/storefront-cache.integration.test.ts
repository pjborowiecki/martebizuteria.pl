import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import zod from "zod/v4"

import { TestCacheStorage } from "~/src/platform/testing/mocks/cache-storage"
import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"
import { testRealtimeHubs } from "~/src/platform/testing/mocks/realtime-hub"
import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import deliveryMethodSeed from "~/src/integrations/drizzle-orm/seeds/delivery-methods.sql?raw"
import categorySeed from "~/src/integrations/drizzle-orm/seeds/product-categories.sql?raw"
import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { findContentPageByHandle } from "~/src/modules/content-page/content-page.accessors"
import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { getContentPage } from "~/src/modules/content-page/use-cases/get-content-page"
import { updateContentPage } from "~/src/modules/content-page/use-cases/update-content-page"
import { listDeliveryMethods } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"
import { getCategories } from "~/src/modules/product-category/use-cases/get-categories"
import { productZodSchemas } from "~/src/modules/product/product.zod"
import { createCompleteProduct } from "~/src/modules/product/use-cases/create-complete-product"
import { getProduct } from "~/src/modules/product/use-cases/get-product"
import { getStorefrontProductsPage } from "~/src/modules/product/use-cases/get-storefront-products-page"
import { updateCompleteProduct } from "~/src/modules/product/use-cases/update-complete-product"
import { session } from "~/src/modules/session/session.schema"
import { getSalesStatus } from "~/src/modules/store-setting/use-cases/get-sales-status"
import { getAdminSellerDetails, getSellerDetails } from "~/src/modules/store-setting/use-cases/get-seller-details"
import { setSalesPaused } from "~/src/modules/store-setting/use-cases/set-sales-paused"
import { updateSellerDetails } from "~/src/modules/store-setting/use-cases/update-seller-details"

import { executionContextStorage } from "~/src/lib/background"
import { STOREFRONT_CACHE_NAME, isPublicCatalogRead } from "~/src/lib/storefront-cache.server"
import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

const { requests, sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")
  const recorded: TestD1RoundTrip[] = []

  return {
    requests: { current: new Request("https://marte.test/") },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    trips: recorded,
  }
})

vi.mock("cloudflare:workers", async () => {
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")
  const { TestDurableObject, testRealtimeHubs: hubs } = await import("~/src/platform/testing/mocks/realtime-hub")

  return {
    DurableObject: TestDurableObject,
    env: {
      AUDIT_LOG_QUEUE: { send: () => Promise.resolve() },
      DB: createTestD1Database(sqlite, undefined, (trip) => {
        trips.push(trip)
      }),
      REALTIME_INVALIDATION_HUB: hubs,
    },
  }
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

  return { ...actual, getRequest: () => requests.current, getRequestHeaders: () => requests.current.headers }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () =>
    Promise.resolve({
      session: { id: "admin-session" },
      user: { email: "admin@marte.test", id: "admin", name: "Admin", role: ROLES.ADMIN, twoFactorEnabled: true },
    }),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { expire: vi.fn() } } } }))

const storage = new TestCacheStorage()

const NECKLACES = "019e91fb-0641-71e1-90a9-fb70c79176af"

const SIMPLE_VARIANT = { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: "SILVER-RING" }

const catalog = productZodSchemas.catalogUpsertInput.parse({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: { "en-US": "A ring", "pl-PL": "Pierścionek" },
  handle: "silver-ring",
  hasVariants: false,
  options: [],
  primaryCategoryId: NECKLACES,
  simpleVariant: SIMPLE_VARIANT,
  status: "active",
  subtitles: { "en-US": "", "pl-PL": "" },
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
})

const settle = async (pending: Promise<unknown>[]): Promise<void> => {
  const settled = pending.length
  await Promise.all(pending)
  if (pending.length > settled) {
    await settle(pending)
  }
}

const visit = async <TResult>(work: () => Promise<TResult>): Promise<TResult> => {
  requests.current = new Request("https://marte.test/products")
  const pending: Promise<unknown>[] = []
  const result = await executionContextStorage.run(
    {
      waitUntil: (promise) => {
        pending.push(promise)
      },
    },
    work,
  )
  await settle(pending)

  return result
}

const tripsDuring = async (work: () => Promise<unknown>): Promise<number> => {
  const before = trips.length
  await visit(work)

  return trips.length - before
}

const variantIdOf = (productId: string): string => {
  const row = sqlite.prepare("select id from product_variant where product_id = ?").get(productId)
  if (typeof row?.["id"] !== "string") {
    throw new TypeError(`Product ${productId} has no variant`)
  }

  return row["id"]
}

const readProduct = () => visit(() => getProduct({ data: { handle: "silver-ring", locale: "en-US" } }))

const createRing = () => visit(() => createCompleteProduct({ data: { ...catalog, attributeValues: [], images: [] } }))

interface VariantChange {
  readonly loadedQuantity?: number
  readonly price?: string
  readonly quantity?: number
}

const updateRing = (id: string, change: VariantChange, titles = catalog.titles) =>
  visit(() =>
    updateCompleteProduct({
      data: {
        ...catalog,
        attributeValues: [],
        id,
        images: [],
        simpleVariant: { ...SIMPLE_VARIANT, ...change, id: variantIdOf(id) },
        titles,
        variantAttributeValues: [],
      },
    }),
  )

const readListing = () => visit(() => getStorefrontProductsPage({ data: { scope: { categoryHandle: "naszyjniki" } } }))

const readStorefront = () =>
  Promise.all([
    getSalesStatus(),
    getSellerDetails(),
    getCategories(),
    listDeliveryMethods(),
    getStorefrontProductsPage({ data: { scope: { categoryHandle: "naszyjniki" } } }),
  ])

const readAbout = () => visit(() => getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.ABOUT, locale: "en-US" } }))

const catalogVersion = () => testRealtimeHubs.getByName(REALTIME_INVALIDATION_HUB.STOREFRONT).storefrontCacheVersion()

const CACHE_KEY_MATERIAL = zod.tuple([zod.string(), zod.string()]).rest(zod.unknown())

const cachedSql = (data: BufferSource): string => {
  const material: unknown = JSON.parse(new TextDecoder().decode(data))

  return CACHE_KEY_MATERIAL.parse(material)[1]
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(categorySeed)
  sqlite.exec(deliveryMethodSeed)
})

beforeEach(() => {
  vi.stubGlobal("caches", storage)
  storage.opened.clear()
  storage.failOpen = false
  testRealtimeHubs.reset()
  sqlite.exec("delete from product_variant; delete from product; delete from inventory; delete from price_history")
})

afterAll(() => {
  sqlite.close()
})

describe("storefront reads through the cache", () => {
  it("answers a repeated storefront read without a D1 round trip", async () => {
    await createRing()

    await expect(tripsDuring(readProduct)).resolves.toBeGreaterThan(0)
    await expect(tripsDuring(readProduct)).resolves.toBe(0)
    await expect(readProduct()).resolves.toMatchObject({ handle: "silver-ring", title: "Silver ring" })
  })

  it("caches the settings, the categories, the delivery methods and a listing the same way", async () => {
    await createRing()

    await tripsDuring(readStorefront)

    await expect(tripsDuring(readStorefront)).resolves.toBe(0)
  })

  it("reads the admin console's settings from D1 every time", async () => {
    await visit(() => getAdminSellerDetails())

    await expect(tripsDuring(() => getAdminSellerDetails())).resolves.toBe(1)
  })
})

describe("storefront freshness after a change", () => {
  it("shows a renamed product on the next request", async () => {
    const { id } = await createRing()
    await readProduct()

    await updateRing(id, {}, { "en-US": "Polished ring", "pl-PL": "Polerowany pierścionek" })

    await expect(readProduct()).resolves.toMatchObject({ title: "Polished ring" })
  })

  it("shows a new price on the next request", async () => {
    const { id } = await createRing()
    await readProduct()

    await updateRing(id, { price: "150" })

    await expect(readProduct()).resolves.toMatchObject({ variants: [{ price: 15_000 }] })
  })

  it("takes a product that sold out off its page and its category listing on the next request", async () => {
    const { id } = await createRing()
    await readProduct()
    await expect(readListing()).resolves.toMatchObject({ total: 1 })

    await updateRing(id, { loadedQuantity: 5, quantity: 0 })

    await expect(readProduct()).resolves.toBe(false)
    await expect(readListing()).resolves.toMatchObject({ items: [], total: 0 })
  })

  it("shows an edited content page on the next request", async () => {
    const before = await readAbout()
    const page = await findContentPageByHandle(CONTENT_PAGE_HANDLE.ABOUT)
    if (page === undefined) {
      throw new Error("The about page was not migrated")
    }

    await visit(() =>
      updateContentPage({
        data: {
          bodies: { ...page.bodies, "en-US": "We make every piece by hand." },
          descriptions: page.descriptions,
          expectedUpdatedAt: page.updatedAt,
          handle: CONTENT_PAGE_HANDLE.ABOUT,
          titles: page.titles,
        },
      }),
    )

    expect(before.body).not.toBe("We make every piece by hand.")
    await expect(readAbout()).resolves.toMatchObject({ body: "We make every piece by hand." })
  })

  it("shows the seller's new details and a paused shop on the next request", async () => {
    const seller = await visit(() => getSellerDetails())
    await visit(() => getSalesStatus())

    await visit(() => updateSellerDetails({ data: { ...TEST_SELLER_DETAILS, city: "Bochnia", expectedUpdatedAt: seller.updatedAt } }))
    await visit(() => setSalesPaused({ data: { salesPaused: true } }))

    await expect(visit(() => getSellerDetails())).resolves.toMatchObject({ city: "Bochnia" })
    await expect(visit(() => getSalesStatus())).resolves.toStrictEqual({ salesPaused: true })
  })
})

describe("what the storefront cache keeps", () => {
  it("stores answers only for statements over the public catalogue, never a session lookup made during a storefront read", async () => {
    const digest = vi.spyOn(crypto.subtle, "digest")
    await createRing()

    await visit(() =>
      Promise.all([
        getProduct({ data: { handle: "silver-ring", locale: "en-US" } }),
        getSellerDetails(),
        readThroughStorefrontCache(() => db.select().from(session)),
      ]),
    )

    const cachedStatements = digest.mock.calls.map(([, data]) => cachedSql(data))
    expect(cachedStatements.length).toBeGreaterThan(0)
    expect(cachedStatements.filter((sql) => !isPublicCatalogRead(sql) || sql.includes('"session"'))).toStrictEqual([])
    expect(storage.cache(STOREFRONT_CACHE_NAME).entries.size).toBe(cachedStatements.length)
  })

  it("serves every read from D1 when the cache cannot be opened", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    await createRing()
    storage.failOpen = true

    await expect(tripsDuring(readProduct)).resolves.toBeGreaterThan(0)
    await expect(tripsDuring(readProduct)).resolves.toBeGreaterThan(0)
    await expect(readProduct()).resolves.toMatchObject({ title: "Silver ring" })
    expect(log).toHaveBeenCalledWith("[Storefront Cache] The cache could not be opened, so this request reads D1:", expect.any(Error))
  })

  it("serves every read from D1 while the catalogue version cannot be read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    await createRing()
    testRealtimeHubs.failVersionReads = true

    await readProduct()

    await expect(tripsDuring(readProduct)).resolves.toBeGreaterThan(0)
    expect(log).toHaveBeenCalledWith(
      "[Storefront Cache] The catalogue version could not be read, so this request reads D1:",
      expect.any(Error),
    )
  })

  it("moves the catalogue version only through the storefront hub", async () => {
    const before = await catalogVersion()

    await testRealtimeHubs.getByName(REALTIME_INVALIDATION_HUB.ADMIN).notifyInvalidation(['["admin","orders"]'])

    await expect(catalogVersion()).resolves.toBe(before)
  })
})

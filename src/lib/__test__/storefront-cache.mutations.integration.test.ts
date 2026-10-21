import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"
import { testRealtimeHubs } from "~/src/platform/testing/mocks/realtime-hub"
import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import deliveryMethodSeed from "~/src/integrations/drizzle-orm/seeds/delivery-methods.sql?raw"
import categorySeed from "~/src/integrations/drizzle-orm/seeds/product-categories.sql?raw"
import collectionSeed from "~/src/integrations/drizzle-orm/seeds/product-collections.sql?raw"
import {
  scheduleAdminAuditLogInvalidation,
  scheduleAdminCustomersInvalidation,
  scheduleAdminNewsletterSubscribersInvalidation,
  scheduleAdminOrdersInvalidation,
  scheduleCategoryCatalogInvalidation,
  scheduleCollectionCatalogInvalidation,
  scheduleContentPageInvalidation,
  scheduleDeliveryMethodsInvalidation,
  scheduleFreeDeliveryInvalidation,
  scheduleProductAttributeCatalogInvalidation,
  scheduleProductCatalogInvalidation,
  scheduleSalesStatusInvalidation,
  scheduleSellerDetailsInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { setAllProductAttributes } from "~/src/modules/attribute-on-product/use-cases/set-all-product-attributes"
import { findContentPageByHandle } from "~/src/modules/content-page/content-page.accessors"
import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { updateContentPage } from "~/src/modules/content-page/use-cases/update-content-page"
import { archiveDeliveryMethod } from "~/src/modules/delivery-method/use-cases/archive-delivery-method"
import { createDeliveryMethod } from "~/src/modules/delivery-method/use-cases/create-delivery-method"
import { reorderDeliveryMethods } from "~/src/modules/delivery-method/use-cases/reorder-delivery-methods"
import { updateDeliveryMethod } from "~/src/modules/delivery-method/use-cases/update-delivery-method"
import { reserveInventoryForItems } from "~/src/modules/inventory/use-cases/reserve-inventory.server"
import { cancelOrder } from "~/src/modules/order/use-cases/cancel-order"
import { returnOrderToStock } from "~/src/modules/order/use-cases/return-order-to-stock.server"
import { createProductAttribute } from "~/src/modules/product-attribute/use-cases/create-product-attribute"
import { deleteProductAttributes } from "~/src/modules/product-attribute/use-cases/delete-product-attributes"
import { reorderProductAttributes } from "~/src/modules/product-attribute/use-cases/reorder-product-attributes"
import { updateProductAttribute } from "~/src/modules/product-attribute/use-cases/update-product-attribute"
import { createCategory } from "~/src/modules/product-category/use-cases/create-category"
import { deleteCategories } from "~/src/modules/product-category/use-cases/delete-categories"
import { reorderCategories } from "~/src/modules/product-category/use-cases/reorder-categories"
import { updateCategory } from "~/src/modules/product-category/use-cases/update-category"
import { createCollection } from "~/src/modules/product-collection/use-cases/create-collection"
import { deleteCollections } from "~/src/modules/product-collection/use-cases/delete-collections"
import { reorderCollections } from "~/src/modules/product-collection/use-cases/reorder-collections"
import { updateCollection } from "~/src/modules/product-collection/use-cases/update-collection"
import { productZodSchemas } from "~/src/modules/product/product.zod"
import { createCompleteProduct } from "~/src/modules/product/use-cases/create-complete-product"
import { deleteProducts } from "~/src/modules/product/use-cases/delete-products"
import { reorderProducts } from "~/src/modules/product/use-cases/reorder-products"
import { updateCompleteProduct } from "~/src/modules/product/use-cases/update-complete-product"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"
import { setFreeDeliveryThreshold } from "~/src/modules/store-setting/use-cases/set-free-delivery-threshold"
import { setSalesPaused } from "~/src/modules/store-setting/use-cases/set-sales-paused"
import { updateSellerDetails } from "~/src/modules/store-setting/use-cases/update-seller-details"

import { executionContextStorage } from "~/src/lib/background"

const { requests, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    requests: { current: new Request("http://localhost:3000/admin") },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", async () => {
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")
  const { TestDurableObject, testRealtimeHubs: hubs } = await import("~/src/platform/testing/mocks/realtime-hub")

  return {
    DurableObject: TestDurableObject,
    env: { AUDIT_LOG_QUEUE: { send: () => Promise.resolve() }, DB: createTestD1Database(sqlite), REALTIME_INVALIDATION_HUB: hubs },
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
vi.mock("~/src/modules/order/use-cases/send-order-cancelled-email.server", () => ({ sendOrderCancelledEmail: () => Promise.resolve(true) }))

const NECKLACES = "019e91fb-0641-71e1-90a9-fb70c79176af"

const INPOST_ID = "019f4a10-0000-7000-8000-000000000001"

const LOCALES = { "en-US": "", "pl-PL": "" }

const CANCELLED_ORDER_ID = "019f4a10-0000-7000-8000-0000000000c1"

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
  subtitles: LOCALES,
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
})

const category = {
  descriptions: LOCALES,
  handle: "rings",
  image: "",
  parentId: "",
  shortDescriptions: LOCALES,
  status: "active" as const,
  subtitles: LOCALES,
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
}

const collection = {
  descriptions: LOCALES,
  handle: "winter",
  image: "",
  shortDescriptions: LOCALES,
  status: "active" as const,
  titles: { "en-US": "Winter", "pl-PL": "Zima" },
}

const attribute = { allowedValues: [], handle: "stone", titles: { "en-US": "Stone", "pl-PL": "Kamień" }, type: "text" as const, unit: "" }

const deliveryMethod = { isActive: false, names: { "en-US": "DPD courier", "pl-PL": "Kurier DPD" }, price: 1899 }

const settle = async (pending: Promise<unknown>[]): Promise<void> => {
  const settled = pending.length
  await Promise.all(pending)
  if (pending.length > settled) {
    await settle(pending)
  }
}

const visit = async <TResult>(work: () => PromiseLike<TResult>): Promise<TResult> => {
  requests.current = new Request("http://localhost:3000/admin")
  const pending: Promise<unknown>[] = []
  const result = await executionContextStorage.run(
    {
      waitUntil: (promise) => {
        pending.push(promise)
      },
    },
    () => work(),
  )
  await settle(pending)

  return result
}

const catalogVersion = () => testRealtimeHubs.getByName(REALTIME_INVALIDATION_HUB.STOREFRONT).storefrontCacheVersion()

const expectNewCatalogVersion = async (change: () => PromiseLike<unknown>): Promise<void> => {
  const before = await catalogVersion()

  await visit(change)

  await expect(catalogVersion()).resolves.not.toBe(before)
}

const rowId = (sql: string, ...params: string[]): string => {
  const row = sqlite.prepare(sql).get(...params)
  if (typeof row?.["id"] !== "string") {
    throw new TypeError(`No row for ${sql}`)
  }

  return row["id"]
}

const updatedAtOf = (table: string, id: string): Date =>
  new Date(Number(sqlite.prepare(`select updated_at from ${table} where id = ?`).get(id)?.["updated_at"]))

const createRing = () => visit(() => createCompleteProduct({ data: { ...catalog, attributeValues: [], images: [] } }))

const variantOf = (productId: string): string => rowId("select id from product_variant where product_id = ?", productId)

const inventoryOf = (productId: string): string => rowId("select id from inventory where variant_id = ?", variantOf(productId))

const placeOrderFor = (productId: string, orderId: string): void => {
  sqlite
    .prepare(`insert into "order" (id, email, order_number, created_at, updated_at) values (?, 'anna@marte.test', ?, 0, 0)`)
    .run(orderId, orderId)
  sqlite
    .prepare(
      `insert into order_item (id, order_id, variant_id, quantity, subtotal, title, total, unit_price, created_at) values (?, ?, ?, 1, 12000, 'Silver ring', 12000, 12000, 0)`,
    )
    .run(`${orderId}-item`, orderId, variantOf(productId))
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(categorySeed)
  sqlite.exec(collectionSeed)
  sqlite.exec(deliveryMethodSeed)
})

beforeEach(() => {
  testRealtimeHubs.reset()
})

afterAll(() => {
  sqlite.close()
})

describe("catalogue changes start a new storefront catalogue version", () => {
  it.each([
    ["creating a category", () => createCategory({ data: { ...category, handle: "rings-create" } })],
    [
      "editing a category",
      async () => {
        const { id } = await createCategory({ data: { ...category, handle: "rings-edit" } })

        return updateCategory({ data: { ...category, handle: "rings-edit", id, titles: { "en-US": "Bands", "pl-PL": "Obrączki" } } })
      },
    ],
    [
      "deleting a category",
      async () => {
        const { id } = await createCategory({ data: { ...category, handle: "rings-delete" } })

        return deleteCategories({ data: [id] })
      },
    ],
    ["reordering the categories", () => reorderCategories({ data: [NECKLACES] })],
    ["creating a collection", () => createCollection({ data: { ...collection, handle: "winter-create" } })],
    [
      "editing a collection",
      async () => {
        const { id } = await createCollection({ data: { ...collection, handle: "winter-edit" } })

        return updateCollection({ data: { ...collection, handle: "winter-edit", id, titles: { "en-US": "Snow", "pl-PL": "Śnieg" } } })
      },
    ],
    [
      "deleting a collection",
      async () => {
        const { id } = await createCollection({ data: { ...collection, handle: "winter-delete" } })

        return deleteCollections({ data: [id] })
      },
    ],
    [
      "reordering the collections",
      async () => {
        const { id } = await createCollection({ data: { ...collection, handle: "winter-reorder" } })

        return reorderCollections({ data: [id] })
      },
    ],
    ["creating a specification", () => createProductAttribute({ data: { ...attribute, handle: "stone-create" } })],
    [
      "editing a specification",
      async () => {
        const { id } = await createProductAttribute({ data: { ...attribute, handle: "stone-edit" } })

        return updateProductAttribute({ data: { ...attribute, handle: "stone-edit", id, titles: { "en-US": "Gem", "pl-PL": "Klejnot" } } })
      },
    ],
    [
      "deleting a specification",
      async () => {
        const { id } = await createProductAttribute({ data: { ...attribute, handle: "stone-delete" } })

        return deleteProductAttributes({ data: [id] })
      },
    ],
    [
      "reordering the specifications",
      async () => {
        const { id } = await createProductAttribute({ data: { ...attribute, handle: "stone-reorder" } })

        return reorderProductAttributes({ data: [id] })
      },
    ],
  ])("%s", async (_change, change) => {
    await expectNewCatalogVersion(change)
  })
})

describe("product changes start a new storefront catalogue version", () => {
  beforeEach(() => {
    sqlite.exec(`delete from order_item; delete from "order"; delete from product_variant; delete from product; delete from inventory`)
  })

  it("creating a product", async () => {
    await expectNewCatalogVersion(() => createCompleteProduct({ data: { ...catalog, attributeValues: [], images: [] } }))
  })

  it.each([
    ["renaming it", { titles: { "en-US": "Polished ring", "pl-PL": "Polerowany pierścionek" } }, {}],
    ["changing its price", {}, { price: "150" }],
    ["changing its stock", {}, { loadedQuantity: 5, quantity: 1 }],
  ])("editing a product: %s", async (_change, product, variant) => {
    const { id } = await createRing()

    await expectNewCatalogVersion(() =>
      updateCompleteProduct({
        data: {
          ...catalog,
          ...product,
          attributeValues: [],
          id,
          images: [],
          simpleVariant: { ...SIMPLE_VARIANT, ...variant, id: variantOf(id) },
          variantAttributeValues: [],
        },
      }),
    )
  })

  it("deleting a product", async () => {
    const { id } = await createRing()

    await expectNewCatalogVersion(() => deleteProducts({ data: [id] }))
  })

  it("reordering the products", async () => {
    const { id } = await createRing()

    await expectNewCatalogVersion(() => reorderProducts({ data: [id] }))
  })

  it("replacing a product's specifications", async () => {
    const { id } = await createRing()
    const stone = await visit(() => createProductAttribute({ data: { ...attribute, handle: "stone-spec" } }))

    await expectNewCatalogVersion(() =>
      setAllProductAttributes({ data: { productId: id, productValues: [{ attributeId: stone.id, value: "Onyx" }], variantValues: [] } }),
    )
  })
})

describe("stock changes start a new storefront catalogue version", () => {
  beforeEach(() => {
    sqlite.exec(`delete from order_item; delete from "order"; delete from product_variant; delete from product; delete from inventory`)
  })

  it("an admin cancelling an order returns its stock", async () => {
    const { id } = await createRing()
    placeOrderFor(id, CANCELLED_ORDER_ID)

    await expectNewCatalogVersion(() => cancelOrder({ data: { orderId: CANCELLED_ORDER_ID } }))
  })

  it("an order going back to stock", async () => {
    const { id } = await createRing()
    placeOrderFor(id, "order-return")

    await expectNewCatalogVersion(() => returnOrderToStock("order-return"))
  })

  it("a checkout whose reservation is rolled back because another line ran out", async () => {
    const { id } = await createRing()
    const ring = { inventoryId: inventoryOf(id), qty: 1, title: "Silver ring" }

    await expectNewCatalogVersion(() =>
      reserveInventoryForItems([ring, { inventoryId: "sold-out", qty: 1, title: "Sold out" }]).catch((error: unknown) => error),
    )
  })

  it.each([
    ["checkouts, payments, refunds and webhooks", scheduleProductCatalogInvalidation],
    ["categories", scheduleCategoryCatalogInvalidation],
    ["collections", scheduleCollectionCatalogInvalidation],
    ["specifications", scheduleProductAttributeCatalogInvalidation],
    ["content pages", scheduleContentPageInvalidation],
    ["delivery methods", scheduleDeliveryMethodsInvalidation],
    ["the free delivery threshold", scheduleFreeDeliveryInvalidation],
    ["paused sales", scheduleSalesStatusInvalidation],
    ["the seller's details", scheduleSellerDetailsInvalidation],
  ])("the publisher every change to %s goes through", async (_change, publish) => {
    await expectNewCatalogVersion(() => {
      publish()

      return Promise.resolve()
    })
  })

  it.each([
    ["admin orders", scheduleAdminOrdersInvalidation],
    ["customers", scheduleAdminCustomersInvalidation],
    ["newsletter subscribers", scheduleAdminNewsletterSubscribersInvalidation],
    ["the audit log", scheduleAdminAuditLogInvalidation],
  ])("but a change only admins see, to %s, keeps the version", async (_change, publish) => {
    const before = await catalogVersion()

    await visit(() => {
      publish()

      return Promise.resolve()
    })

    await expect(catalogVersion()).resolves.toBe(before)
  })
})

describe("content and settings changes start a new storefront catalogue version", () => {
  it("editing a content page", async () => {
    const page = await findContentPageByHandle(CONTENT_PAGE_HANDLE.FAQ)
    if (page === undefined) {
      throw new Error("The FAQ page was not migrated")
    }

    await expectNewCatalogVersion(() =>
      updateContentPage({
        data: {
          bodies: { ...page.bodies, "en-US": "Ask us anything." },
          descriptions: page.descriptions,
          expectedUpdatedAt: page.updatedAt,
          handle: CONTENT_PAGE_HANDLE.FAQ,
          titles: page.titles,
        },
      }),
    )
  })

  it("saving the seller's details", async () => {
    const { updatedAt } = await readSellerDetails()

    await expectNewCatalogVersion(() =>
      updateSellerDetails({ data: { ...TEST_SELLER_DETAILS, city: "Tarnów", expectedUpdatedAt: updatedAt } }),
    )
  })

  it("pausing sales", async () => {
    await expectNewCatalogVersion(() => setSalesPaused({ data: { salesPaused: true } }))
  })

  it("changing the free delivery threshold", async () => {
    await expectNewCatalogVersion(() => setFreeDeliveryThreshold({ data: { threshold: 25_000 } }))
  })

  it("adding a delivery method", async () => {
    await expectNewCatalogVersion(() => createDeliveryMethod({ data: { ...deliveryMethod, courier: { name: "DPD" }, type: "courier" } }))
  })

  it("editing a delivery method", async () => {
    const { id } = await visit(() => createDeliveryMethod({ data: { ...deliveryMethod, courier: { id: INPOST_ID }, type: "courier" } }))

    await expectNewCatalogVersion(() =>
      updateDeliveryMethod({ data: { ...deliveryMethod, expectedUpdatedAt: updatedAtOf("delivery_method", id), id, price: 2099 } }),
    )
  })

  it("archiving a delivery method", async () => {
    const { id } = await visit(() => createDeliveryMethod({ data: { ...deliveryMethod, courier: { id: INPOST_ID }, type: "courier" } }))

    await expectNewCatalogVersion(() => archiveDeliveryMethod({ data: { archived: true, id } }))
  })

  it("reordering the delivery methods", async () => {
    const ids = sqlite
      .prepare("select id from delivery_method where archived_at is null order by rank")
      .all()
      .map((row) => String(row["id"]))

    await expectNewCatalogVersion(() => reorderDeliveryMethods({ data: ids.toReversed() }))
  })
})

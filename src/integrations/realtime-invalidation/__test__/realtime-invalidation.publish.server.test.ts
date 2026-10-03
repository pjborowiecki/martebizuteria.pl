import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  scheduleAdminCustomersInvalidation,
  scheduleAdminOrdersInvalidation,
  scheduleCategoryCatalogInvalidation,
  scheduleCollectionCatalogInvalidation,
  scheduleContentPageInvalidation,
  scheduleProductAttributeCatalogInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import {
  parseSerializedQueryKeyPrefix,
  queryKeyPrefixesOverlap,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import {
  publishRealtimeInvalidation,
  scheduleRealtimeInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"
import {
  ADMIN_REALTIME_QUERY_PREFIXES,
  STOREFRONT_REALTIME_QUERY_PREFIXES,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { CONTENT_PAGE_QUERY_KEYS } from "~/src/modules/content-page/content-page.constants"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

const { hub } = vi.hoisted(() => ({
  hub: {
    getByName: vi.fn((name: string) => ({
      notifyInvalidation: (topics: readonly string[]) => {
        hub.notified.push({ name, topics })

        return Promise.resolve()
      },
    })),
    notified: [] as { name: string; topics: readonly string[] }[],
  },
}))

const { background } = vi.hoisted(() => ({ background: { scheduled: [] as Promise<unknown>[] } }))

vi.mock("cloudflare:workers", () => ({ DurableObject: Object, env: { REALTIME_INVALIDATION_HUB: hub } }))
vi.mock("~/src/lib/background", () => ({
  scheduleBackgroundWork: (task: Promise<unknown>) => {
    background.scheduled.push(task)
  },
}))

const topicsFor = (name: string): readonly string[] => hub.notified.find((entry) => entry.name === name)?.topics ?? []

const serialized = (queryKeys: readonly unknown[][]): string[] => queryKeys.map((queryKey) => JSON.stringify(queryKey))

describe("publishRealtimeInvalidation", () => {
  beforeEach(() => {
    hub.notified.length = 0
    hub.getByName.mockClear()
    background.scheduled.length = 0
  })

  it("routes each side's prefixes to its own hub as serialized topics", async () => {
    await publishRealtimeInvalidation({
      admin: [PRODUCT_QUERY_KEYS.ADMIN.ALL],
      storefront: [PRODUCT_QUERY_KEYS.ALL, PRODUCT_QUERY_KEYS.BY_HANDLE],
    })

    expect(topicsFor("admin")).toStrictEqual(serialized([[...PRODUCT_QUERY_KEYS.ADMIN.ALL]]))
    expect(topicsFor("storefront")).toStrictEqual(serialized([[...PRODUCT_QUERY_KEYS.ALL], [...PRODUCT_QUERY_KEYS.BY_HANDLE]]))
  })

  it("never opens a hub that has nothing to broadcast", async () => {
    await publishRealtimeInvalidation({ admin: [], storefront: [] })

    expect(hub.notified).toStrictEqual([])
  })

  it("leaves the storefront untouched for an admin-only invalidation", async () => {
    await publishRealtimeInvalidation({ admin: [ORDER_QUERY_KEYS.ADMIN.ORDERS] })

    expect(hub.notified.map((entry) => entry.name)).toStrictEqual(["admin"])
  })

  it("publishes storefront-only changes without opening an admin hub", async () => {
    await publishRealtimeInvalidation({ storefront: [PRODUCT_QUERY_KEYS.BY_HANDLE] })

    expect(hub.getByName).toHaveBeenCalledExactlyOnceWith("storefront")
    expect(topicsFor("storefront")).toStrictEqual(serialized([[...PRODUCT_QUERY_KEYS.BY_HANDLE]]))
  })

  it("does nothing when neither audience has an invalidation", async () => {
    await publishRealtimeInvalidation({})

    expect(hub.getByName).not.toHaveBeenCalled()
    expect(hub.notified).toStrictEqual([])
  })

  it("hands the publish to background work instead of awaiting it inline", async () => {
    scheduleRealtimeInvalidation({ admin: [ORDER_QUERY_KEYS.ADMIN.ORDERS] })

    expect(background.scheduled).toHaveLength(1)
    await Promise.all(background.scheduled)
    expect(topicsFor("admin")).toStrictEqual(serialized([[...ORDER_QUERY_KEYS.ADMIN.ORDERS]]))
  })
})

describe("catalog invalidation scheduling", () => {
  beforeEach(async () => {
    hub.notified.length = 0
    background.scheduled.length = 0
    await Promise.resolve()
  })

  it("refreshes the cart availability alongside the storefront product lists on a product change", async () => {
    scheduleProductCatalogInvalidation()
    await Promise.all(background.scheduled)

    expect(topicsFor("admin")).toStrictEqual(serialized([[...PRODUCT_QUERY_KEYS.ADMIN.ALL], [...PRODUCT_QUERY_KEYS.ADMIN.STATS]]))
    expect(topicsFor("storefront")).toContain(JSON.stringify([...CART_QUERY_KEYS.AVAILABILITY]))
  })

  it("refreshes both category views on a category change", async () => {
    scheduleCategoryCatalogInvalidation()
    await Promise.all(background.scheduled)

    expect(topicsFor("admin")).toStrictEqual(serialized([[...CATEGORY_QUERY_KEYS.ADMIN.ALL], [...CATEGORY_QUERY_KEYS.ADMIN.STATS]]))
    expect(topicsFor("storefront")).toStrictEqual(serialized([[...CATEGORY_QUERY_KEYS.ALL], [...CATEGORY_QUERY_KEYS.BY_HANDLE]]))
  })

  it("refreshes the landing new arrivals when a collection changes", async () => {
    scheduleCollectionCatalogInvalidation()
    await Promise.all(background.scheduled)

    expect(topicsFor("storefront")).toStrictEqual(
      serialized([[...COLLECTION_QUERY_KEYS.ALL], [...COLLECTION_QUERY_KEYS.BY_HANDLE], [...PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS]]),
    )
  })

  it("refreshes the edited page for admins and the storefront page readers alike", async () => {
    scheduleContentPageInvalidation()
    await Promise.all(background.scheduled)

    expect(topicsFor("admin")).toStrictEqual(
      serialized([[...CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL], [...CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE]]),
    )
    expect(topicsFor("storefront")).toStrictEqual(serialized([[...CONTENT_PAGE_QUERY_KEYS.BY_HANDLE]]))
  })

  it.each([
    [
      "attributes",
      scheduleProductAttributeCatalogInvalidation,
      [PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL, PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS],
    ],
    ["customers", scheduleAdminCustomersInvalidation, [USER_QUERY_KEYS.ADMIN.CUSTOMERS, USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE]],
    ["orders", scheduleAdminOrdersInvalidation, [ORDER_QUERY_KEYS.ADMIN.ORDERS]],
  ])("keeps the %s invalidation off the storefront hub", async (_name, schedule, expected) => {
    schedule()
    await Promise.all(background.scheduled)

    expect(hub.notified.map((entry) => entry.name)).toStrictEqual(["admin"])
    expect(topicsFor("admin")).toStrictEqual(serialized(expected.map((queryKey) => [...queryKey])))
  })

  it.each([
    ["product", scheduleProductCatalogInvalidation],
    ["category", scheduleCategoryCatalogInvalidation],
    ["collection", scheduleCollectionCatalogInvalidation],
    ["content page", scheduleContentPageInvalidation],
    ["attribute", scheduleProductAttributeCatalogInvalidation],
    ["customers", scheduleAdminCustomersInvalidation],
    ["orders", scheduleAdminOrdersInvalidation],
  ])("broadcasts %s topics that a subscribed client would actually match", async (_name, schedule) => {
    schedule()
    await Promise.all(background.scheduled)

    const subscribed = {
      admin: ADMIN_REALTIME_QUERY_PREFIXES,
      storefront: STOREFRONT_REALTIME_QUERY_PREFIXES,
    }

    expect(hub.notified.length).toBeGreaterThan(0)
    for (const { name, topics } of hub.notified) {
      const prefixes = name === "admin" ? subscribed.admin : subscribed.storefront
      for (const topic of topics) {
        const published = parseSerializedQueryKeyPrefix(topic)

        expect(published).toBeDefined()
        expect(prefixes.some((prefix) => queryKeyPrefixesOverlap([...prefix], published ?? []))).toBe(true)
      }
    }
  })
})

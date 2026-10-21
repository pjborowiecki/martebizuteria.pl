import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestCacheStorage } from "~/src/platform/testing/mocks/cache-storage"
import { type TestD1RoundTrip, createTestD1Database } from "~/src/platform/testing/mocks/d1"
import { testRealtimeHubs } from "~/src/platform/testing/mocks/realtime-hub"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { executionContextStorage } from "~/src/lib/background"
import { timeD1Statements } from "~/src/lib/server-timing"
import {
  STOREFRONT_CACHE_MAX_AGE_SECONDS,
  STOREFRONT_CACHE_NAME,
  cacheStorefrontReads,
  isPublicCatalogRead,
} from "~/src/lib/storefront-cache.server"
import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

const requests = vi.hoisted(() => ({ current: new Request("https://marte.test/products") }))

vi.mock("cloudflare:workers", async () => {
  const { TestDurableObject, testRealtimeHubs: hubs } = await import("~/src/platform/testing/mocks/realtime-hub")

  return { DurableObject: TestDurableObject, env: { REALTIME_INVALIDATION_HUB: hubs } }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => requests.current }
})

const storage = new TestCacheStorage()

const storefrontCache = () => storage.cache(STOREFRONT_CACHE_NAME)

const openDatabase = () => {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(`
    create table "product" ("id" text, "handle" text, "title" text);
    create table "session" ("id" text, "token" text);
    insert into "product" values ('p1', 'ring', 'Silver ring'), ('p2', 'band', 'Gold band');
    insert into "session" values ('s1', 'secret');
  `)
  const trips: TestD1RoundTrip[] = []
  const timed = timeD1Statements(
    createTestD1Database(sqlite, undefined, (trip) => {
      trips.push(trip)
    }),
  )

  return { binding: cacheStorefrontReads(timed), sqlite, timed, trips }
}

const PRODUCT_BY_HANDLE = 'select "title" from "product" where "handle" = ?'

const firstValue = async (statement: D1PreparedStatement): Promise<unknown> => {
  const [row] = await statement.raw()

  return row?.[0]
}

const visitOn = async <TResult>(origin: string, work: () => Promise<TResult>): Promise<TResult> => {
  requests.current = new Request(`${origin}/products`)
  const pending: Promise<unknown>[] = []
  const result = await executionContextStorage.run(
    {
      waitUntil: (promise) => {
        pending.push(promise)
      },
    },
    work,
  )
  await Promise.all(pending)

  return result
}

const visit = <TResult>(work: () => Promise<TResult>): Promise<TResult> => visitOn("https://marte.test", work)

const titleOf = (binding: D1Database, handle: string) =>
  visit(() => readThroughStorefrontCache(() => firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind(handle))))

const bumpCatalogVersion = () => testRealtimeHubs.getByName(REALTIME_INVALIDATION_HUB.STOREFRONT).notifyInvalidation(['["products"]'])

beforeEach(() => {
  vi.stubGlobal("caches", storage)
  storage.opened.clear()
  storage.failOpen = false
  testRealtimeHubs.reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("public catalogue reads", () => {
  it.each([
    'select "id" from "product" where "handle" = ?',
    'select "product"."id" from "product" left join "product_variant" on "product_variant"."product_id" = "product"."id"',
    'select "id" from "product" where "id" in (select value from json_each(?))',
    'with recursive category_tree(root_id, id) as (select "product_category"."id", "product_category"."id" from "product_category" union all select category_tree.root_id, "product_category"."id" from "product_category" inner join category_tree on "product_category"."parent_id" = category_tree.id) select category_tree.root_id from category_tree inner join "category_on_product" on "category_on_product"."category_id" = category_tree.id',
    'select "seller_email" from "store_setting" limit ?',
    'select "id" from "product" where json_extract("metadata", \'$.note\') = \'delete me, update [x]\'',
    'select "id", "updated_at", "created_at" from "product"',
    'select "id" from "product" order by "position", "id" limit ?, ?',
    'select "id", "title" from "product" group by "id", "title"',
    'select "id", (select json_group_array(json_array("id", "price")) from (select "id", "price" from "product_variant" where "product_variant"."product_id" = "product"."id") "variants") as "variants" from "product"',
  ])("treats %s as a public catalogue read", (sql) => {
    expect(isPublicCatalogRead(sql)).toBe(true)
  })

  it.each([
    'select "token" from "session" where "id" = ?',
    'select "product"."id" from "product" inner join "wishlist_item" on "wishlist_item"."product_id" = "product"."id"',
    'with "matches" as (select "product_id" from "product_search" where "product_search" match ?) select "id" from "product" inner join "matches" on "matches"."product_id" = "product"."id"',
    'update "inventory" set "quantity_available" = ?',
    'insert into "product" ("id") values (?)',
    "select 1",
    "select * from rate_limit",
    'with "picked" as (select "id" from "product") update "inventory" set "quantity_available" = 0 returning "id"',
    'with "picked" as (select "id" from "product") delete from "product" where "id" in (select "id" from "picked") returning "id"',
    'select "product"."id" from "product", "session"',
    'select "p"."id" from "product" "p", "session" "s" where "s"."token" = ?',
    'select "product"."id" from "product" inner join "inventory" on "inventory"."product_id" = "product"."id", "session"',
    'select "product"."id" from "product" join "inventory" on ("inventory"."product_id" = "product"."id"), "session"',
    'select "id" from "product" where "id" in (select "product"."id" from "product" join "inventory" on "inventory"."product_id" = "product"."id", "session")',
    'select "value" from json_each(?), "session"',
    'select "id" from "product" "where", "session"',
    'select "id" from "product") , "session" where ("id" = ?',
    "select `id` from `product`",
    "select [id] from [product]",
    'select "id" from "product"; drop table "session"',
    'select "id" from "product" where "id" in (select "id" from "product" union select "id" from "session")',
  ])("never treats %s as a public catalogue read", (sql) => {
    expect(isPublicCatalogRead(sql)).toBe(false)
  })
})

describe("storefront read cache", () => {
  it("answers the next request for the same public statement from the cache", async () => {
    const { binding, trips } = openDatabase()

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")
    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(trips).toHaveLength(1)
  })

  it("keeps the statement's parameters in the cache key", async () => {
    const { binding } = openDatabase()

    await titleOf(binding, "ring")

    await expect(titleOf(binding, "band")).resolves.toBe("Gold band")
  })

  it("reads D1 again once the catalogue version changes, and serves the new answer", async () => {
    const { binding, sqlite, trips } = openDatabase()
    await titleOf(binding, "ring")
    sqlite.exec(`update "product" set "title" = 'Polished ring' where "handle" = 'ring'`)

    await bumpCatalogVersion()

    await expect(titleOf(binding, "ring")).resolves.toBe("Polished ring")
    expect(trips).toHaveLength(2)
  })

  it("keeps serving the cached answer until the version changes", async () => {
    const { binding, sqlite } = openDatabase()
    await titleOf(binding, "ring")
    sqlite.exec(`update "product" set "title" = 'Polished ring' where "handle" = 'ring'`)

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")
  })

  it("reads D1 for every statement outside a storefront read", async () => {
    const { binding, trips } = openDatabase()

    await visit(() => firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind("ring")))
    await visit(() => firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind("ring")))

    expect(trips).toHaveLength(2)
    expect(storefrontCache().entries.size).toBe(0)
  })

  it("never caches a statement that reads a table outside the public catalogue", async () => {
    const { binding, trips } = openDatabase()
    const readSession = () =>
      visit(() => readThroughStorefrontCache(() => firstValue(binding.prepare('select "token" from "session" where "id" = ?').bind("s1"))))

    await readSession()
    await expect(readSession()).resolves.toBe("secret")

    expect(trips).toHaveLength(2)
    expect(storefrontCache().entries.size).toBe(0)
  })

  it("never caches a write, even inside a storefront read", async () => {
    const { binding, sqlite } = openDatabase()

    await visit(() =>
      readThroughStorefrontCache(() => binding.prepare('update "product" set "title" = ? where "handle" = ?').bind("Ring", "ring").run()),
    )

    expect(sqlite.prepare('select "title" from "product" where "handle" = ?').get("ring")).toEqual({ title: "Ring" })
    expect(storefrontCache().entries.size).toBe(0)
  })

  it("stores each answer for an hour at most", async () => {
    const { binding } = openDatabase()

    await titleOf(binding, "ring")

    expect([...storefrontCache().entries.values()][0]?.headers).toContainEqual([
      "cache-control",
      `public, max-age=${String(STOREFRONT_CACHE_MAX_AGE_SECONDS)}`,
    ])
  })

  it("reads the catalogue version once per request, however many statements the request runs", async () => {
    const { binding } = openDatabase()
    const read = vi.spyOn(testRealtimeHubs, "getByName")

    await visit(() =>
      readThroughStorefrontCache(async () => [
        await firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind("ring")),
        await firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind("band")),
      ]),
    )

    expect(read).toHaveBeenCalledOnce()
  })

  it("reads D1 for every request on a workers.dev address, where the Cache API stores nothing, and never asks the hub", async () => {
    const { binding, trips } = openDatabase()
    const read = vi.spyOn(testRealtimeHubs, "getByName")
    const readOnWorkersDev = () =>
      visitOn("https://martebizuteria.pjborowiecki.workers.dev", () =>
        readThroughStorefrontCache(() => firstValue(binding.prepare(PRODUCT_BY_HANDLE).bind("ring"))),
      )

    await readOnWorkersDev()
    await expect(readOnWorkersDev()).resolves.toBe("Silver ring")

    expect(trips).toHaveLength(2)
    expect(read).not.toHaveBeenCalled()
    expect(storefrontCache().entries.size).toBe(0)
  })

  it("passes a batch on with the statements D1 prepared", async () => {
    const { binding, trips } = openDatabase()

    const results = await visit(() =>
      readThroughStorefrontCache(() =>
        binding.batch([binding.prepare(PRODUCT_BY_HANDLE).bind("ring"), binding.prepare('select "id" from "product"')]),
      ),
    )

    expect(results.map(({ results: rows }) => rows.length)).toStrictEqual([1, 2])
    expect(trips.map(({ kind }) => kind)).toStrictEqual(["batch"])
  })

  it("still sends a statement that was prepared without the cache wrapper", async () => {
    const { binding, timed } = openDatabase()

    const [result] = await visit(() => binding.batch([timed.prepare('select "handle" from "product" where "id" = ?').bind("p2")]))

    expect(result?.results).toEqual([{ handle: "band" }])
  })

  it("passes other binding properties through", () => {
    const { binding } = openDatabase()

    expect(Reflect.get(binding, "withSession")).toBeUndefined()
    expect(typeof Reflect.get(binding, "prepare")).toBe("function")
  })

  it("reads other statement properties straight from the statement", () => {
    const { binding } = openDatabase()

    expect(Reflect.get(binding.prepare(PRODUCT_BY_HANDLE).bind("ring"), "query")).toStrictEqual({
      params: ["ring"],
      sql: PRODUCT_BY_HANDLE,
    })
  })
})

describe("storefront read cache failures", () => {
  it("reads D1 when the catalogue version cannot be read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { binding, trips } = openDatabase()
    testRealtimeHubs.failVersionReads = true

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")
    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(trips).toHaveLength(2)
    expect(log).toHaveBeenCalledWith(
      "[Storefront Cache] The catalogue version could not be read, so this request reads D1:",
      expect.any(Error),
    )
  })

  it("reads D1 when the hub does not answer the version in time", async () => {
    const { binding, trips } = openDatabase()
    testRealtimeHubs.hangVersionReads = true
    const startedAt = performance.now()

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(performance.now() - startedAt).toBeLessThan(1000)
    expect(trips).toHaveLength(1)
    expect(storefrontCache().entries.size).toBe(0)
  })

  it("reads D1 when the cache cannot be opened", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { binding, trips } = openDatabase()
    storage.failOpen = true

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(trips).toHaveLength(1)
    expect(log).toHaveBeenCalledWith("[Storefront Cache] The cache could not be opened, so this request reads D1:", expect.any(Error))
  })

  it("reads D1 when a cached answer cannot be read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { binding, trips } = openDatabase()
    await titleOf(binding, "ring")
    storefrontCache().failMatch = true

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(trips).toHaveLength(2)
    expect(log).toHaveBeenCalledWith("[Storefront Cache] A cached answer could not be read, so this request reads D1:", expect.any(Error))
  })

  it("still answers when the answer cannot be stored", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { binding } = openDatabase()
    storefrontCache().failPut = true

    await expect(titleOf(binding, "ring")).resolves.toBe("Silver ring")

    expect(log).toHaveBeenCalledWith("[Background Work Failed]:", expect.any(Error))
  })
})

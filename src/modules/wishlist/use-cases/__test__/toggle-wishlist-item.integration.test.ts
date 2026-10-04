import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"

const { customer, roundTrips, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    customer: "user-ada",
    roundTrips: [] as TestD1RoundTrip[],
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
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

  return { ...actual, getRequest: () => new Request("https://marte.test/products/aurora-ring") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve({ user: { id: customer } }),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        roundTrips.push(trip)
      }),
      { schema },
    ),
  }
})

const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { ERROR_CODES } = await import("~/src/modules/_core/constants/errors")
const { WISHLIST_ERROR_CODES, WISHLIST_MAX_ITEMS } = await import("~/src/modules/wishlist/wishlist.constants")
const { toggleWishlistItem } = await import("~/src/modules/wishlist/use-cases/toggle-wishlist-item")

const OTHER_CUSTOMER = "user-grace"

const TOGGLE_READS = {
  kind: "batch",
  sql: [
    expect.stringMatching(/^delete from "wishlist_item" .* returning "id"$/u),
    expect.stringMatching(/^select "id", \(select count\(\*\) from "wishlist_item" where .*\) from "product" .* limit \?$/u),
  ],
}

const save = (userId: string, productId: string): void => {
  sqlite.prepare(`insert into wishlist_item (id, user_id, product_id) values (?, ?, ?)`).run(`${userId}:${productId}`, userId, productId)
}

const savedProductIds = (userId: string): string[] =>
  sqlite
    .prepare(`select product_id from wishlist_item where user_id = ? order by product_id`)
    .all(userId)
    .map((row) => String(row["product_id"]))

const fillWishlist = (userId: string): void => {
  sqlite
    .prepare(`insert into wishlist_item (id, user_id, product_id) select ? || ':' || id, ?, id from product where handle like 'bulk-%'`)
    .run(userId, userId)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into user (id, email, name) values
      ('${customer}', 'ada@marte.test', 'Ada'),
      ('${OTHER_CUSTOMER}', 'grace@marte.test', 'Grace');
    insert into product (id, handle, status, titles) values
      ('p-aurora', 'aurora-ring', 'published', '{"en-US":"Aurora ring"}'),
      ('p-luna', 'luna-necklace', 'published', '{"en-US":"Luna necklace"}'),
      ('p-draft', 'draft-bracelet', 'draft', '{"en-US":"Draft bracelet"}'),
      ('p-archived', 'old-earrings', 'archived', '{"en-US":"Old earrings"}');
    with recursive sequence(position) as (select 1 union all select position + 1 from sequence where position < ${WISHLIST_MAX_ITEMS})
    insert into product (id, handle, status, titles)
    select 'p-bulk-' || position, 'bulk-' || position, 'published', '{"en-US":"Bulk"}' from sequence;
  `)
})

beforeEach(() => {
  sqlite.exec(`delete from wishlist_item`)
  roundTrips.length = 0
})

afterAll(() => {
  sqlite.close()
})

describe("toggleWishlistItem against the database", () => {
  it("saves a published product in two round trips: the delete and the read in one batch, then the insert", async () => {
    await expect(toggleWishlistItem({ data: { productId: "p-aurora" } })).resolves.toStrictEqual({ wishlisted: true })

    expect(roundTrips).toStrictEqual([
      TOGGLE_READS,
      { kind: "statement", sql: [expect.stringMatching(/^insert into "wishlist_item" .* on conflict .* do nothing$/u)] },
    ])
    expect(savedProductIds(customer)).toStrictEqual(["p-aurora"])
  })

  it("removes a saved product in one round trip", async () => {
    save(customer, "p-aurora")
    save(customer, "p-luna")

    await expect(toggleWishlistItem({ data: { productId: "p-aurora" } })).resolves.toStrictEqual({ wishlisted: false })

    expect(roundTrips).toStrictEqual([TOGGLE_READS])
    expect(savedProductIds(customer)).toStrictEqual(["p-luna"])
  })

  it("removes only the caller's own row for that product", async () => {
    save(customer, "p-aurora")
    save(OTHER_CUSTOMER, "p-aurora")

    await toggleWishlistItem({ data: { productId: "p-aurora" } })

    expect(savedProductIds(customer)).toStrictEqual([])
    expect(savedProductIds(OTHER_CUSTOMER)).toStrictEqual(["p-aurora"])
  })

  it.each(["p-draft", "p-archived", "p-missing"])("refuses to save %s, which is not on sale, and stores nothing", async (productId) => {
    await expect(toggleWishlistItem({ data: { productId } })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })

    expect(roundTrips).toStrictEqual([TOGGLE_READS])
    expect(savedProductIds(customer)).toStrictEqual([])
  })

  it("lets go of a saved product that has since been withdrawn", async () => {
    save(customer, "p-archived")

    await expect(toggleWishlistItem({ data: { productId: "p-archived" } })).resolves.toStrictEqual({ wishlisted: false })
    expect(savedProductIds(customer)).toStrictEqual([])
  })

  it("refuses a customer who has already saved as many products as a wishlist holds", async () => {
    fillWishlist(customer)

    await expect(toggleWishlistItem({ data: { productId: "p-aurora" } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: WISHLIST_ERROR_CODES.FULL,
    })

    expect(roundTrips).toStrictEqual([TOGGLE_READS])
    expect(savedProductIds(customer)).toHaveLength(WISHLIST_MAX_ITEMS)
    expect(savedProductIds(customer)).not.toContain("p-aurora")
  })

  it("lets a full wishlist give a product up", async () => {
    fillWishlist(customer)

    await expect(toggleWishlistItem({ data: { productId: "p-bulk-1" } })).resolves.toStrictEqual({ wishlisted: false })
    expect(savedProductIds(customer)).toHaveLength(WISHLIST_MAX_ITEMS - 1)
  })

  it("still saves the product that fills the wishlist to its limit", async () => {
    fillWishlist(customer)
    sqlite.prepare(`delete from wishlist_item where user_id = ? and product_id = 'p-bulk-1'`).run(customer)

    await expect(toggleWishlistItem({ data: { productId: "p-aurora" } })).resolves.toStrictEqual({ wishlisted: true })
    expect(savedProductIds(customer)).toHaveLength(WISHLIST_MAX_ITEMS)
  })

  it("does not count another customer's saved products against the caller's limit", async () => {
    fillWishlist(OTHER_CUSTOMER)

    await expect(toggleWishlistItem({ data: { productId: "p-aurora" } })).resolves.toStrictEqual({ wishlisted: true })
  })
})

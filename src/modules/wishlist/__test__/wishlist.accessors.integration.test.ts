import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import {
  countWishlistItems,
  deleteWishlistItem,
  getPublishedProductById,
  getWishlistItem,
  getWishlistProductIds,
  getWishlistRows,
  insertWishlistItem,
} from "~/src/modules/wishlist/wishlist.accessors"
import { WISHLIST_MAX_ITEMS } from "~/src/modules/wishlist/wishlist.constants"

const CUSTOMER = "user-1"

const OTHER_CUSTOMER = "user-2"

const savedAt = (day: number): number => Date.UTC(2026, 8, day)

interface SavedFixture {
  readonly createdAt: number
  readonly id: string
  readonly productId: string
  readonly userId: string
}

const insertSaved = ({ createdAt, id, productId, userId }: SavedFixture): void => {
  sqlite
    .prepare(`insert into wishlist_item (id, user_id, product_id, created_at, updated_at) values (?, ?, ?, ?, ?)`)
    .run(id, userId, productId, createdAt, createdAt)
}

const countRows = (userId: string): number =>
  Number(sqlite.prepare(`select count(*) as total from wishlist_item where user_id = ?`).get(userId)?.["total"])

beforeEach(() => {
  sqlite.exec(`
    drop table if exists wishlist_item;
    drop table if exists product;
    drop table if exists product_variant;
    drop table if exists inventory;

    create table wishlist_item (
      id text primary key, product_id text not null, user_id text not null, created_at integer not null, updated_at integer not null
    );
    create unique index wishlist_item_userId_productId_unique on wishlist_item (user_id, product_id);
    create table product (
      id text primary key, handle text not null, status text not null, thumbnail text, titles text not null
    );
    create table product_variant (id text primary key, product_id text not null, title text not null, price integer not null);
    create table inventory (id text primary key, variant_id text not null, quantity_available integer not null);

    insert into product (id, handle, status, thumbnail, titles) values
      ('p-aurora', 'aurora-ring', 'published', 'products/aurora.webp', '{"en-US":"Aurora ring","pl-PL":"Pierścionek Aurora"}'),
      ('p-luna', 'luna-necklace', 'published', null, '{"en-US":"Luna necklace"}'),
      ('p-draft', 'draft-bracelet', 'draft', null, '{"en-US":"Draft bracelet"}'),
      ('p-archived', 'old-earrings', 'archived', null, '{"en-US":"Old earrings"}');
    insert into product_variant (id, product_id, title, price) values
      ('v-aurora-gold', 'p-aurora', 'Gold / 54', 32900),
      ('v-aurora-silver', 'p-aurora', 'Silver / 54', 24900);
    insert into inventory (id, variant_id, quantity_available) values
      ('i-gold', 'v-aurora-gold', 2),
      ('i-silver', 'v-aurora-silver', 3);
  `)
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("saving and removing a wishlist item", () => {
  it("stores the product against the customer under a freshly generated id", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("0199bb55-3f5e-4aaa-8c4e-d4f5a6b7c8d9")

    await insertWishlistItem(CUSTOMER, "p-aurora")

    await expect(getWishlistItem(CUSTOMER, "p-aurora")).resolves.toMatchObject({
      id: "0199bb55-3f5e-4aaa-8c4e-d4f5a6b7c8d9",
      productId: "p-aurora",
      userId: CUSTOMER,
    })
  })

  it("stamps a new row with the database clock", async () => {
    await insertWishlistItem(CUSTOMER, "p-aurora")

    const saved = await getWishlistItem(CUSTOMER, "p-aurora")

    expect(saved?.createdAt).toBeInstanceOf(Date)
    expect(saved?.updatedAt).toStrictEqual(saved?.createdAt)
  })

  it("keeps a single row when the same product is saved twice", async () => {
    await insertWishlistItem(CUSTOMER, "p-aurora")
    await insertWishlistItem(CUSTOMER, "p-aurora")

    expect(countRows(CUSTOMER)).toBe(1)
  })

  it("does not find another customer's saved product", async () => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-aurora", userId: OTHER_CUSTOMER })

    await expect(getWishlistItem(CUSTOMER, "p-aurora")).resolves.toBeUndefined()
  })

  it("removes only the caller's own row for that product", async () => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-aurora", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(2), id: "saved-2", productId: "p-luna", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(3), id: "saved-3", productId: "p-aurora", userId: OTHER_CUSTOMER })

    await deleteWishlistItem(CUSTOMER, "p-aurora")

    await expect(getWishlistProductIds(CUSTOMER)).resolves.toStrictEqual(["p-luna"])
    await expect(getWishlistProductIds(OTHER_CUSTOMER)).resolves.toStrictEqual(["p-aurora"])
  })
})

describe("reading a customer's saved products", () => {
  beforeEach(() => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-aurora", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(2), id: "saved-2", productId: "p-luna", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(3), id: "saved-3", productId: "p-draft", userId: OTHER_CUSTOMER })
  })

  it("counts only the caller's own saved products", async () => {
    await expect(countWishlistItems(CUSTOMER)).resolves.toBe(2)
    await expect(countWishlistItems("user-without-saves")).resolves.toBe(0)
  })

  it("lists the ids of the caller's saved products", async () => {
    const ids = await getWishlistProductIds(CUSTOMER)

    expect(ids.toSorted()).toStrictEqual(["p-aurora", "p-luna"])
  })
})

describe("getPublishedProductById", () => {
  it("finds a product that is on sale", async () => {
    await expect(getPublishedProductById("p-aurora")).resolves.toStrictEqual({ id: "p-aurora", status: PRODUCT_STATUS.PUBLISHED })
  })

  it.each(["p-draft", "p-archived", "p-missing"])("finds nothing to save for %s", async (productId) => {
    await expect(getPublishedProductById(productId)).resolves.toBeUndefined()
  })
})

describe("getWishlistRows", () => {
  it("lists the caller's saved products newest first with their cheapest variant and total stock", async () => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-aurora", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(2), id: "saved-2", productId: "p-luna", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(3), id: "saved-3", productId: "p-draft", userId: OTHER_CUSTOMER })

    await expect(getWishlistRows(CUSTOMER)).resolves.toStrictEqual([
      {
        addedAt: new Date(savedAt(2)),
        handle: "luna-necklace",
        priceMinorUnits: null,
        productId: "p-luna",
        status: PRODUCT_STATUS.PUBLISHED,
        thumbnail: null,
        titles: { "en-US": "Luna necklace" },
        totalStock: 0,
        variantId: null,
        variantTitle: null,
      },
      {
        addedAt: new Date(savedAt(1)),
        handle: "aurora-ring",
        priceMinorUnits: 24_900,
        productId: "p-aurora",
        status: PRODUCT_STATUS.PUBLISHED,
        thumbnail: "products/aurora.webp",
        titles: { "en-US": "Aurora ring", "pl-PL": "Pierścionek Aurora" },
        totalStock: 5,
        variantId: "v-aurora-silver",
        variantTitle: "Silver / 54",
      },
    ])
  })

  it("keeps a saved product that has since been withdrawn so the customer can see it went away", async () => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-archived", userId: CUSTOMER })

    const rows = await getWishlistRows(CUSTOMER)

    expect(rows.map((row) => row.status)).toStrictEqual([PRODUCT_STATUS.ARCHIVED])
  })

  it("returns only as many rows as the caller asked for", async () => {
    insertSaved({ createdAt: savedAt(1), id: "saved-1", productId: "p-aurora", userId: CUSTOMER })
    insertSaved({ createdAt: savedAt(2), id: "saved-2", productId: "p-luna", userId: CUSTOMER })

    const rows = await getWishlistRows(CUSTOMER, 1)

    expect(rows.map((row) => row.productId)).toStrictEqual(["p-luna"])
  })

  it("stops at the wishlist ceiling by default", async () => {
    sqlite.exec(`
      with recursive sequence(position) as (select 1 union all select position + 1 from sequence where position <= ${WISHLIST_MAX_ITEMS})
      insert into product (id, handle, status, thumbnail, titles)
      select 'bulk-' || position, 'bulk-' || position, 'published', null, '{"en-US":"Bulk"}' from sequence;
      with recursive sequence(position) as (select 1 union all select position + 1 from sequence where position <= ${WISHLIST_MAX_ITEMS})
      insert into wishlist_item (id, user_id, product_id, created_at, updated_at)
      select 'saved-' || position, '${CUSTOMER}', 'bulk-' || position, position, position from sequence;
    `)

    const rows = await getWishlistRows(CUSTOMER)

    expect(countRows(CUSTOMER)).toBe(WISHLIST_MAX_ITEMS + 1)
    expect(rows).toHaveLength(WISHLIST_MAX_ITEMS)
    expect(rows.map((row) => row.productId)).not.toContain("bulk-1")
  })
})

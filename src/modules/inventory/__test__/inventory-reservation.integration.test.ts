import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"

import { getAvailabilityByVariantIds, releaseInventoryForItems, reserveInventoryRows } from "~/src/modules/inventory/inventory.accessors"
import { reserveInventoryByVariantLines, reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"

const { sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    sqlite: new DatabaseSync(":memory:"),
    trips: [] as TestD1RoundTrip[],
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        trips.push(trip)
      }),
      { schema },
    ),
  }
})

const STARTING_STOCK = 10

const STARTING_VERSION = 1

const reserveOne = async (item: Parameters<typeof reserveInventoryRows>[0][number]): Promise<boolean> => {
  const reserved = await reserveInventoryRows([item])

  return reserved.has(item.inventoryId)
}

const inventoryRowSchema = z.object({ available: z.number(), reserved: z.number(), version: z.number() })

const readRow = (inventoryId: string): z.infer<typeof inventoryRowSchema> =>
  inventoryRowSchema.parse(
    sqlite
      .prepare(`select quantity_available as available, quantity_reserved as reserved, version from inventory where id = ?`)
      .get(inventoryId),
  )

beforeEach(() => {
  trips.splice(0)
  sqlite.exec(`
    drop table if exists inventory;
    create table inventory (
      id text primary key, variant_id text, quantity_available integer, quantity_reserved integer,
      version integer, created_at integer, updated_at integer
    );
    insert into inventory (id, variant_id, quantity_available, quantity_reserved, version) values
      ('inv_a', 'var_a', ${STARTING_STOCK}, 0, ${STARTING_VERSION}),
      ('inv_b', 'var_b', ${STARTING_STOCK}, 0, ${STARTING_VERSION});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("inventory reservation compare-and-set semantics", () => {
  it("reserves stock and bumps the version when the guard matches", async () => {
    const reserved = await reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 3 })

    expect(reserved).toBe(true)
    expect(readRow("inv_a")).toEqual({ available: 7, reserved: 3, version: STARTING_VERSION + 1 })
  })

  it("refuses when the row moved under it, leaving the row untouched", async () => {
    sqlite.exec(`update inventory set version = 9 where id = 'inv_a'`)

    const reserved = await reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 3 })

    expect(reserved).toBe(false)
    expect(readRow("inv_a")).toEqual({ available: STARTING_STOCK, reserved: 0, version: 9 })
  })

  it("refuses to oversell when the requested quantity exceeds availability", async () => {
    const reserved = await reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: STARTING_STOCK + 1 })

    expect(reserved).toBe(false)
    expect(readRow("inv_a").available).toBe(STARTING_STOCK)
  })

  it("allows reserving exactly the remaining stock", async () => {
    const reserved = await reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: STARTING_STOCK })

    expect(reserved).toBe(true)
    expect(readRow("inv_a").available).toBe(0)
  })

  it("lets only the first of two racing reservations win on the same version", async () => {
    const [first, second] = await Promise.all([
      reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 }),
      reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 }),
    ])

    expect([first, second].filter(Boolean)).toHaveLength(1)
    expect(readRow("inv_a").available).toBe(STARTING_STOCK - 4)
  })
})

describe("inventory reservation across several lines", () => {
  it("reserves every line when all guards pass", async () => {
    await reserveInventoryForItems([
      { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
      { currentVersion: STARTING_VERSION, inventoryId: "inv_b", qty: 5, title: "B" },
    ])

    expect(readRow("inv_a").available).toBe(8)
    expect(readRow("inv_b").available).toBe(5)
  })

  it("reserves every line of the cart in one round trip", async () => {
    await reserveInventoryForItems([
      { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
      { currentVersion: STARTING_VERSION, inventoryId: "inv_b", qty: 5, title: "B" },
    ])

    expect(trips.map(({ kind, sql }) => [kind, sql.length])).toStrictEqual([["batch", 2]])
  })

  it("reserves two lines of the same variant together instead of failing the second on the version", async () => {
    await reserveInventoryForItems([
      { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
      { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 3, title: "A" },
    ])

    expect(readRow("inv_a")).toEqual({ available: 5, reserved: 5, version: STARTING_VERSION + 1 })
  })

  it("compensates the succeeded lines when a later line fails its guard", async () => {
    await expect(
      reserveInventoryForItems([
        { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
        { currentVersion: STARTING_VERSION, inventoryId: "inv_b", qty: STARTING_STOCK + 1, title: "B" },
      ]),
    ).rejects.toThrow(/Inventory reservation failed for B/u)

    expect(readRow("inv_a").available).toBe(STARTING_STOCK)
    expect(readRow("inv_b").available).toBe(STARTING_STOCK)
  })

  it("names the first failing line in the error", async () => {
    await expect(reserveInventoryForItems([{ currentVersion: 99, inventoryId: "inv_a", qty: 1, title: "Onyx earrings" }])).rejects.toThrow(
      /Onyx earrings/u,
    )
  })

  it("restores quantities but not the original version after compensation", async () => {
    await expect(
      reserveInventoryForItems([
        { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
        { currentVersion: 99, inventoryId: "inv_b", qty: 1, title: "B" },
      ]),
    ).rejects.toThrow()

    const row = readRow("inv_a")
    expect(row.available).toBe(STARTING_STOCK)
    expect(row.version).toBeGreaterThan(STARTING_VERSION)
  })
})

describe("inventory reservation by variant", () => {
  it("reads every line's stock row in one query and reserves them together", async () => {
    await reserveInventoryByVariantLines([
      { qty: 1, variantId: "var_a" },
      { qty: 2, variantId: "var_b" },
    ])

    expect(readRow("inv_a")).toEqual({ available: 9, reserved: 1, version: STARTING_VERSION + 1 })
    expect(readRow("inv_b")).toEqual({ available: 8, reserved: 2, version: STARTING_VERSION + 1 })
  })

  it("refuses every line when one variant has no stock row", async () => {
    await expect(
      reserveInventoryByVariantLines([
        { qty: 1, variantId: "var_a" },
        { qty: 1, variantId: "var_missing" },
      ]),
    ).rejects.toThrow("Inventory not found for variant var_missing.")

    expect(readRow("inv_a")).toEqual({ available: STARTING_STOCK, reserved: 0, version: STARTING_VERSION })
  })
})

describe("inventory release after reservation", () => {
  it("returns previously reserved stock", async () => {
    await reserveOne({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 })
    await releaseInventoryForItems([{ inventoryId: "inv_a", qty: 4 }])

    expect(readRow("inv_a")).toEqual({ available: STARTING_STOCK, reserved: 0, version: STARTING_VERSION + 2 })
  })

  it("is a no-op for an empty line list", async () => {
    await releaseInventoryForItems([])

    expect(readRow("inv_a").version).toBe(STARTING_VERSION)
  })
})

describe("inventory availability lookup", () => {
  it("maps availability by variant id", async () => {
    await expect(getAvailabilityByVariantIds(["var_a", "var_b"])).resolves.toEqual(
      new Map([
        ["var_a", STARTING_STOCK],
        ["var_b", STARTING_STOCK],
      ]),
    )
  })

  it("returns an empty map without querying when given no ids", async () => {
    await expect(getAvailabilityByVariantIds([])).resolves.toEqual(new Map())

    expect(trips).toStrictEqual([])
  })
})

describe("inventory reservation of an empty cart", () => {
  it("reserves nothing and never reaches the database", async () => {
    await expect(reserveInventoryRows([])).resolves.toStrictEqual(new Set())

    expect(trips).toStrictEqual([])
  })
})

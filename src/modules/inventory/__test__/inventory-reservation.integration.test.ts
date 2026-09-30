import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1Query } from "~/src/platform/testing/mocks/d1"

import { getAvailabilityByVariantIds, releaseInventoryForItems, reserveInventory } from "~/src/modules/inventory/inventory.accessors"
import { reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    queries: [] as TestD1Query[],
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const STARTING_STOCK = 10

const STARTING_VERSION = 1

const inventoryRowSchema = z.object({ available: z.number(), reserved: z.number(), version: z.number() })

const readRow = (inventoryId: string): z.infer<typeof inventoryRowSchema> =>
  inventoryRowSchema.parse(
    sqlite
      .prepare(`select quantity_available as available, quantity_reserved as reserved, version from inventory where id = ?`)
      .get(inventoryId),
  )

describe("inventory reservation", () => {
  beforeEach(() => {
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

  describe("compare-and-set semantics", () => {
    it("reserves stock and bumps the version when the guard matches", async () => {
      const reserved = await reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 3 })

      expect(reserved).toBe(true)
      expect(readRow("inv_a")).toEqual({ available: 7, reserved: 3, version: STARTING_VERSION + 1 })
    })

    it("refuses when the row moved under it, leaving the row untouched", async () => {
      sqlite.exec(`update inventory set version = 9 where id = 'inv_a'`)

      const reserved = await reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 3 })

      expect(reserved).toBe(false)
      expect(readRow("inv_a")).toEqual({ available: STARTING_STOCK, reserved: 0, version: 9 })
    })

    it("refuses to oversell when the requested quantity exceeds availability", async () => {
      const reserved = await reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: STARTING_STOCK + 1 })

      expect(reserved).toBe(false)
      expect(readRow("inv_a").available).toBe(STARTING_STOCK)
    })

    it("allows reserving exactly the remaining stock", async () => {
      const reserved = await reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: STARTING_STOCK })

      expect(reserved).toBe(true)
      expect(readRow("inv_a").available).toBe(0)
    })

    it("lets only the first of two racing reservations win on the same version", async () => {
      const [first, second] = await Promise.all([
        reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 }),
        reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 }),
      ])

      expect([first, second].filter(Boolean)).toHaveLength(1)
      expect(readRow("inv_a").available).toBe(STARTING_STOCK - 4)
    })
  })

  describe("multi-line reservation", () => {
    it("reserves every line when all guards pass", async () => {
      await reserveInventoryForItems([
        { currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 2, title: "A" },
        { currentVersion: STARTING_VERSION, inventoryId: "inv_b", qty: 5, title: "B" },
      ])

      expect(readRow("inv_a").available).toBe(8)
      expect(readRow("inv_b").available).toBe(5)
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
      await expect(
        reserveInventoryForItems([{ currentVersion: 99, inventoryId: "inv_a", qty: 1, title: "Onyx earrings" }]),
      ).rejects.toThrow(/Onyx earrings/u)
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

  describe("release", () => {
    it("returns previously reserved stock", async () => {
      await reserveInventory({ currentVersion: STARTING_VERSION, inventoryId: "inv_a", qty: 4 })
      await releaseInventoryForItems([{ inventoryId: "inv_a", qty: 4 }])

      expect(readRow("inv_a")).toEqual({ available: STARTING_STOCK, reserved: 0, version: STARTING_VERSION + 2 })
    })

    it("is a no-op for an empty line list", async () => {
      await releaseInventoryForItems([])

      expect(readRow("inv_a").version).toBe(STARTING_VERSION)
    })
  })

  describe("availability lookup", () => {
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
    })
  })
})

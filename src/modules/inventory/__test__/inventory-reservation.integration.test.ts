import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { releaseInventoryForItems, reserveInventoryRows } from "~/src/modules/inventory/inventory.accessors"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { type ReserveInventoryItem } from "~/src/modules/inventory/inventory.types"
import { reserveInventoryForItems } from "~/src/modules/inventory/use-cases/reserve-inventory.server"
import { getPublishedProductsWithInventoryByHandles } from "~/src/modules/product/product.accessors"

const { sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    trips: [] as TestD1RoundTrip[],
  }
})

vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
}))
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

const OUT_OF_STOCK = { message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY }

const HANDLE = "lapis-lazuli-necklace"

const reserveOne = async (item: Parameters<typeof reserveInventoryRows>[0][number]): Promise<boolean> => {
  const reserved = await reserveInventoryRows([item])

  return reserved.has(item.inventoryId)
}

const inventoryRowSchema = z.object({ available: z.number(), reserved: z.number() })

const readRow = (inventoryId: string): z.infer<typeof inventoryRowSchema> =>
  inventoryRowSchema.parse(
    sqlite.prepare("select quantity_available as available, quantity_reserved as reserved from inventory where id = ?").get(inventoryId),
  )

const leaveAvailable = (quantityAvailable: number): void => {
  sqlite.prepare("update inventory set quantity_available = ? where id = 'inv_a'").run(quantityAvailable)
}

const readNecklaceForCheckout = async (title: string): Promise<ReserveInventoryItem> => {
  const [necklace] = await getPublishedProductsWithInventoryByHandles([HANDLE])
  const stock = necklace?.variants.find((variant) => variant.id === "var_a")?.inventory
  if (stock === undefined || stock.quantityAvailable < 1) {
    throw new TypeError(`The ${title} found no necklace on sale`)
  }

  return { inventoryId: stock.id, qty: 1, title }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  trips.splice(0)
  vi.spyOn(console, "warn").mockImplementation(() => {})
  sqlite.exec(`
    delete from product;
    insert into product (id, handle, status, titles) values ('p_lapis', '${HANDLE}', 'published', '{"en-US":"Lapis Lazuli Necklace"}');
    insert into product_variant (id, product_id, title, price) values
      ('var_a', 'p_lapis', 'Silver', 37900),
      ('var_b', 'p_lapis', 'Gold', 37900);
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values
      ('inv_a', 'var_a', ${String(STARTING_STOCK)}, 0),
      ('inv_b', 'var_b', ${String(STARTING_STOCK)}, 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("inventory reservation guarded on the stock available", () => {
  it("reserves the quantity when enough is available", async () => {
    await expect(reserveOne({ inventoryId: "inv_a", qty: 3 })).resolves.toBe(true)

    expect(readRow("inv_a")).toStrictEqual({ available: 7, reserved: 3 })
  })

  it("refuses to oversell when the requested quantity exceeds availability, leaving the row untouched", async () => {
    await expect(reserveOne({ inventoryId: "inv_a", qty: STARTING_STOCK + 1 })).resolves.toBe(false)

    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
  })

  it("allows reserving exactly the remaining stock", async () => {
    await expect(reserveOne({ inventoryId: "inv_a", qty: STARTING_STOCK })).resolves.toBe(true)

    expect(readRow("inv_a")).toStrictEqual({ available: 0, reserved: STARTING_STOCK })
  })

  it("lets only one of two racing reservations take units the stock cannot give both", async () => {
    const results = await Promise.all([reserveOne({ inventoryId: "inv_a", qty: 6 }), reserveOne({ inventoryId: "inv_a", qty: 6 })])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(readRow("inv_a")).toStrictEqual({ available: 4, reserved: 6 })
  })
})

describe("two checkouts reserving the same necklace at the same moment", () => {
  it("reserves for both when the stock covers both, though each read it before the other reserved", async () => {
    const first = await readNecklaceForCheckout("first checkout")
    const second = await readNecklaceForCheckout("second checkout")

    await reserveInventoryForItems([first])
    await reserveInventoryForItems([second])

    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK - 2, reserved: 2 })
  })

  it("reserves for exactly one when only one piece is left, and tells the other the stock ran out", async () => {
    leaveAvailable(1)
    const first = await readNecklaceForCheckout("first checkout")
    const second = await readNecklaceForCheckout("second checkout")

    await reserveInventoryForItems([first])

    await expect(reserveInventoryForItems([second])).rejects.toMatchObject(OUT_OF_STOCK)
    expect(console.warn).toHaveBeenCalledWith("Inventory reservation failed for second checkout. Not enough stock available.")
    expect(readRow("inv_a")).toStrictEqual({ available: 0, reserved: 1 })
  })
})

describe("inventory reservation across several lines", () => {
  it("reserves every line when all guards pass", async () => {
    await reserveInventoryForItems([
      { inventoryId: "inv_a", qty: 2, title: "A" },
      { inventoryId: "inv_b", qty: 5, title: "B" },
    ])

    expect(readRow("inv_a")).toStrictEqual({ available: 8, reserved: 2 })
    expect(readRow("inv_b")).toStrictEqual({ available: 5, reserved: 5 })
  })

  it("reserves every line of the cart in one round trip", async () => {
    await reserveInventoryForItems([
      { inventoryId: "inv_a", qty: 2, title: "A" },
      { inventoryId: "inv_b", qty: 5, title: "B" },
    ])

    expect(trips.map(({ kind, sql }) => [kind, sql.length])).toStrictEqual([["batch", 2]])
  })

  it("reserves two lines of the same variant together", async () => {
    await reserveInventoryForItems([
      { inventoryId: "inv_a", qty: 2, title: "A" },
      { inventoryId: "inv_a", qty: 3, title: "A" },
    ])

    expect(readRow("inv_a")).toStrictEqual({ available: 5, reserved: 5 })
  })

  it("refuses two lines of the same variant that each fit but together ask for more than is available", async () => {
    await expect(
      reserveInventoryForItems([
        { inventoryId: "inv_a", qty: 6, title: "A" },
        { inventoryId: "inv_a", qty: 6, title: "A" },
      ]),
    ).rejects.toMatchObject(OUT_OF_STOCK)

    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
  })

  it("compensates the succeeded lines when a later line fails its guard", async () => {
    await expect(
      reserveInventoryForItems([
        { inventoryId: "inv_a", qty: 2, title: "A" },
        { inventoryId: "inv_b", qty: STARTING_STOCK + 1, title: "B" },
      ]),
    ).rejects.toMatchObject(OUT_OF_STOCK)

    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
    expect(readRow("inv_b")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
  })

  it("names the first failing line in the log", async () => {
    await expect(
      reserveInventoryForItems([{ inventoryId: "inv_a", qty: STARTING_STOCK + 1, title: "Onyx earrings" }]),
    ).rejects.toMatchObject(OUT_OF_STOCK)
    expect(console.warn).toHaveBeenCalledWith("Inventory reservation failed for Onyx earrings. Not enough stock available.")
  })
})

describe("inventory release after reservation", () => {
  it("returns previously reserved stock", async () => {
    await reserveOne({ inventoryId: "inv_a", qty: 4 })
    await releaseInventoryForItems([{ inventoryId: "inv_a", qty: 4 }])

    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
  })

  it("is a no-op for an empty line list", async () => {
    await releaseInventoryForItems([])

    expect(trips).toStrictEqual([])
    expect(readRow("inv_a")).toStrictEqual({ available: STARTING_STOCK, reserved: 0 })
  })
})

describe("inventory reservation of an empty cart", () => {
  it("reserves nothing and never reaches the database", async () => {
    await expect(reserveInventoryRows([])).resolves.toStrictEqual(new Set())

    expect(trips).toStrictEqual([])
  })
})

describe("stock rows on the migrated table", () => {
  it("writes a variant's stock row through the schema and loads it back with only the columns the schema declares", async () => {
    sqlite.exec("insert into product_variant (id, product_id, title, price) values ('var_c', 'p_lapis', 'Rose gold', 37900)")
    const stockedAt = new Date("2026-10-11T08:00:00.000Z")
    await db.insert(inventory).values({ createdAt: stockedAt, id: "inv_c", quantityAvailable: 2, updatedAt: stockedAt, variantId: "var_c" })

    const [necklace] = await getPublishedProductsWithInventoryByHandles([HANDLE])

    expect(necklace?.variants.find((variant) => variant.id === "var_c")?.inventory).toStrictEqual({
      createdAt: stockedAt,
      id: "inv_c",
      quantityAvailable: 2,
      quantityReserved: 0,
      updatedAt: stockedAt,
      variantId: "var_c",
    })
  })
})

import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { releaseInventoryByVariantLines, releaseInventoryForItems } from "~/src/modules/inventory/inventory.accessors"

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

const inventoryRowSchema = z.object({ available: z.number(), reserved: z.number(), version: z.number() })

const readInventory = (inventoryId = "inv_a") =>
  inventoryRowSchema.parse(
    sqlite
      .prepare("select quantity_available as available, quantity_reserved as reserved, version from inventory where id = ?")
      .get(inventoryId),
  )

beforeEach(() => {
  sqlite.exec(`
    drop table if exists inventory;
    create table inventory (
      id text primary key, variant_id text not null unique, quantity_available integer not null,
      quantity_reserved integer not null, version integer not null, created_at integer, updated_at integer
    );
    insert into inventory (id, variant_id, quantity_available, quantity_reserved, version) values
      ('inv_a', 'var_a', 6, 4, 1),
      ('inv_b', 'var_b', 8, 2, 1);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe.each([
  { label: "inventory IDs", release: releaseInventoryForItems },
  { label: "variant IDs", release: releaseInventoryByVariantLines },
])("inventory release by $label", ({ release }) => {
  it.each([
    { available: 8, qty: 2, reserved: 2 },
    { available: 10, qty: 4, reserved: 0 },
    { available: 10, qty: 9, reserved: 0 },
  ])("conserves stock when releasing $qty units", async ({ available, qty, reserved }) => {
    await release([{ inventoryId: "inv_a", qty, variantId: "var_a" }])

    expect(readInventory()).toStrictEqual({ available, reserved, version: 2 })
    expect(readInventory("inv_b")).toStrictEqual({ available: 8, reserved: 2, version: 1 })
  })

  it("does not create stock when no units remain reserved", async () => {
    sqlite.exec("update inventory set quantity_available = 10, quantity_reserved = 0 where id = 'inv_a'")

    await release([{ inventoryId: "inv_a", qty: 4, variantId: "var_a" }])

    expect(readInventory()).toStrictEqual({ available: 10, reserved: 0, version: 2 })
  })

  it("keeps quantities unchanged when an exhausted release is retried", async () => {
    const lines = [{ inventoryId: "inv_a", qty: 4, variantId: "var_a" }]

    await release(lines)
    await release(lines)

    expect(readInventory()).toStrictEqual({ available: 10, reserved: 0, version: 3 })
  })

  it("caps overlapping release requests at the remaining reservation", async () => {
    await Promise.all([
      release([{ inventoryId: "inv_a", qty: 3, variantId: "var_a" }]),
      release([{ inventoryId: "inv_a", qty: 3, variantId: "var_a" }]),
    ])

    expect(readInventory()).toStrictEqual({ available: 10, reserved: 0, version: 3 })
  })

  it("releases each row independently without transferring stock between variants", async () => {
    await release([
      { inventoryId: "inv_a", qty: 2, variantId: "var_a" },
      { inventoryId: "inv_b", qty: 5, variantId: "var_b" },
    ])

    expect(readInventory()).toStrictEqual({ available: 8, reserved: 2, version: 2 })
    expect(readInventory("inv_b")).toStrictEqual({ available: 10, reserved: 0, version: 2 })
  })

  it("ignores a missing inventory row", async () => {
    await release([{ inventoryId: "missing", qty: 4, variantId: "missing" }])

    expect(readInventory()).toStrictEqual({ available: 6, reserved: 4, version: 1 })
  })
})

import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  getAvailabilityByVariantIds,
  getInventoryByVariantId,
  releaseInventoryByVariantLines,
  releaseInventoryForItems,
  reserveInventory,
} from "~/src/modules/inventory/inventory.accessors"

const access = vi.hoisted(() => {
  const reserveExecute = vi.fn<(params: Record<string, number | string>) => Promise<unknown[]>>()
  const releaseExecute = vi.fn<(params: Record<string, number | string>) => Promise<unknown>>()
  const releaseByVariantExecute = vi.fn<(params: Record<string, number | string>) => Promise<unknown>>()
  const findFirst = vi.fn<(input: { where: SQL | undefined }) => Promise<unknown>>()
  const selectWhere = vi.fn<(condition: SQL | undefined) => Promise<{ quantityAvailable: number; variantId: string }[]>>()
  let plainPrepareCount = 0

  return {
    findFirst,
    plainPrepare: () => {
      plainPrepareCount += 1

      return plainPrepareCount === 1 ? { execute: releaseExecute } : { execute: releaseByVariantExecute }
    },
    releaseByVariantExecute,
    releaseExecute,
    reserveExecute,
    selectWhere,
  }
})

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { inventory: { findFirst: access.findFirst } },
    select: () => ({ from: () => ({ where: access.selectWhere }) }),
    update: () => ({
      set: () => ({
        where: () => ({
          prepare: access.plainPrepare,
          returning: () => ({ prepare: () => ({ execute: access.reserveExecute }) }),
        }),
      }),
    }),
  },
}))

const dialect = new SQLiteSyncDialect()

const query = (condition: SQL | undefined) => {
  if (condition === undefined) {
    throw new Error("expected a where condition")
  }

  return dialect.sqlToQuery(condition)
}

describe("reserveInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("moves the requested quantity with the version the caller read", async () => {
    access.reserveExecute.mockResolvedValue([{ id: "inventory-1" }])

    await reserveInventory({ currentVersion: 4, inventoryId: "inventory-1", qty: 2 })

    expect(access.reserveExecute).toHaveBeenCalledWith({ currentVersion: 4, inventoryId: "inventory-1", qty: 2 })
  })

  it("reports success when the guarded update changed a row", async () => {
    access.reserveExecute.mockResolvedValue([{ id: "inventory-1" }])

    await expect(reserveInventory({ currentVersion: 4, inventoryId: "inventory-1", qty: 2 })).resolves.toBe(true)
  })

  it("reports failure when the version moved or the stock ran out", async () => {
    access.reserveExecute.mockResolvedValue([])

    await expect(reserveInventory({ currentVersion: 4, inventoryId: "inventory-1", qty: 2 })).resolves.toBe(false)
  })
})

describe("releaseInventoryForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.releaseExecute.mockResolvedValue(undefined)
  })

  it("does not touch the database for an empty list", async () => {
    await releaseInventoryForItems([])

    expect(access.releaseExecute).not.toHaveBeenCalled()
  })

  it("releases every item by its inventory id", async () => {
    await releaseInventoryForItems([
      { inventoryId: "inventory-1", qty: 2 },
      { inventoryId: "inventory-2", qty: 1 },
    ])

    expect(access.releaseExecute).toHaveBeenNthCalledWith(1, { inventoryId: "inventory-1", qty: 2 })
    expect(access.releaseExecute).toHaveBeenNthCalledWith(2, { inventoryId: "inventory-2", qty: 1 })
  })
})

describe("releaseInventoryByVariantLines", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.releaseByVariantExecute.mockResolvedValue(undefined)
  })

  it("does not touch the database for an empty list", async () => {
    await releaseInventoryByVariantLines([])

    expect(access.releaseByVariantExecute).not.toHaveBeenCalled()
  })

  it("releases every line by its variant id", async () => {
    await releaseInventoryByVariantLines([
      { qty: 3, variantId: "variant-a" },
      { qty: 1, variantId: "variant-b" },
    ])

    expect(access.releaseByVariantExecute).toHaveBeenNthCalledWith(1, { qty: 3, variantId: "variant-a" })
    expect(access.releaseByVariantExecute).toHaveBeenNthCalledWith(2, { qty: 1, variantId: "variant-b" })
  })
})

describe("getInventoryByVariantId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.findFirst.mockResolvedValue(undefined)
  })

  it("looks the stock row up by variant", async () => {
    await getInventoryByVariantId("variant-a")

    expect(query(access.findFirst.mock.calls[0]?.[0].where)).toMatchObject({
      params: ["variant-a"],
      sql: '"inventory"."variant_id" = ?',
    })
  })
})

describe("getAvailabilityByVariantIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("answers an empty request without querying", async () => {
    await expect(getAvailabilityByVariantIds([])).resolves.toStrictEqual(new Map())
    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("maps every returned row by its variant id", async () => {
    access.selectWhere.mockResolvedValue([
      { quantityAvailable: 5, variantId: "variant-a" },
      { quantityAvailable: 0, variantId: "variant-b" },
    ])

    await expect(getAvailabilityByVariantIds(["variant-a", "variant-b"])).resolves.toStrictEqual(
      new Map([
        ["variant-a", 5],
        ["variant-b", 0],
      ]),
    )
  })

  it("asks for exactly the requested variants", async () => {
    access.selectWhere.mockResolvedValue([])

    await getAvailabilityByVariantIds(["variant-a", "variant-b"])

    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ["variant-a", "variant-b"],
      sql: '"inventory"."variant_id" in (?, ?)',
    })
  })

  it("leaves a variant without a stock row out of the map", async () => {
    access.selectWhere.mockResolvedValue([{ quantityAvailable: 5, variantId: "variant-a" }])

    const availability = await getAvailabilityByVariantIds(["variant-a", "variant-ghost"])

    expect(availability.has("variant-ghost")).toBe(false)
  })
})

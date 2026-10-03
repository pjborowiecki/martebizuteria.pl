import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getAvailabilityByVariantIds, getInventoryByVariantIds } from "~/src/modules/inventory/inventory.accessors"

const access = vi.hoisted(() => ({
  selectWhere: vi.fn<(condition: SQL | undefined) => Promise<Record<string, number | string>[]>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    select: () => ({ from: () => ({ where: access.selectWhere }) }),
  },
}))

const dialect = new SQLiteSyncDialect()

const query = (condition: SQL | undefined) => {
  if (condition === undefined) {
    throw new Error("expected a where condition")
  }

  return dialect.sqlToQuery(condition)
}

describe("getInventoryByVariantIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("answers an empty request without querying", async () => {
    await expect(getInventoryByVariantIds([])).resolves.toStrictEqual(new Map())

    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("keys each stock row and its version by variant, in one query for every variant", async () => {
    access.selectWhere.mockResolvedValue([
      { id: "inventory-a", variantId: "variant-a", version: 3 },
      { id: "inventory-b", variantId: "variant-b", version: 7 },
    ])

    await expect(getInventoryByVariantIds(["variant-a", "variant-b"])).resolves.toStrictEqual(
      new Map([
        ["variant-a", { id: "inventory-a", version: 3 }],
        ["variant-b", { id: "inventory-b", version: 7 }],
      ]),
    )
    expect(access.selectWhere).toHaveBeenCalledOnce()
    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ['["variant-a","variant-b"]'],
      sql: '"inventory"."variant_id" in (select value from json_each(?))',
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
      params: ['["variant-a","variant-b"]'],
      sql: '"inventory"."variant_id" in (select value from json_each(?))',
    })
  })

  it("leaves a variant without a stock row out of the map", async () => {
    access.selectWhere.mockResolvedValue([{ quantityAvailable: 5, variantId: "variant-a" }])

    const availability = await getAvailabilityByVariantIds(["variant-a", "variant-ghost"])

    expect(availability.has("variant-ghost")).toBe(false)
  })
})

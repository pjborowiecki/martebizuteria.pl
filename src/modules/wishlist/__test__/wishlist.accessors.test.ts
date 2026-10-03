import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { countWishlistItems } from "~/src/modules/wishlist/wishlist.accessors"

const database = vi.hoisted(() => ({ rows: [] as unknown[] }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { select: () => ({ from: () => ({ where: () => Promise.resolve(database.rows) }) }) },
}))

beforeEach(() => {
  database.rows = []
})

describe("countWishlistItems", () => {
  it("reads the total the count query returns", async () => {
    database.rows = [{ total: 12 }]

    await expect(countWishlistItems("user-1")).resolves.toBe(12)
  })

  it("reports an empty wishlist when the count comes back without a row", async () => {
    await expect(countWishlistItems("user-1")).resolves.toBe(0)
  })
})

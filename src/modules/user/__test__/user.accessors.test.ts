import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { getAdminCustomersPage } from "~/src/modules/user/user.accessors"

const database = vi.hoisted(() => {
  const state = { leftJoins: 0 }

  const makeChain = (): unknown =>
    Object.assign(Promise.resolve([]), {
      as: () => ({}),
      groupBy: () => makeChain(),
      having: () => makeChain(),
      innerJoin: () => makeChain(),
      leftJoin: () => {
        state.leftJoins += 1

        return makeChain()
      },
      limit: () => makeChain(),
      offset: () => makeChain(),
      orderBy: () => makeChain(),
      prepare: () => makeChain(),
      where: () => makeChain(),
    })

  return { makeChain, state }
})

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { user: { findMany: () => database.makeChain() } },
    select: () => ({ from: () => database.makeChain() }),
  },
}))

const page = { limit: 25, offset: 0 }

beforeEach(() => {
  database.state.leftJoins = 0
})

describe("getAdminCustomersPage when the count comes back without a row", () => {
  it("reports an empty customer list instead of an undefined total", async () => {
    await expect(getAdminCustomersPage(page)).resolves.toStrictEqual({ addresses: [], orderStats: [], rows: [], total: 0 })
    expect(database.state.leftJoins).toBe(0)
  })

  it("reports an empty customer list for a filter that joins the order rollup", async () => {
    const filters = { totalSpent: { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GT } }

    await expect(getAdminCustomersPage({ ...page, filters })).resolves.toStrictEqual({ addresses: [], orderStats: [], rows: [], total: 0 })
    expect(database.state.leftJoins).toBe(2)
  })
})

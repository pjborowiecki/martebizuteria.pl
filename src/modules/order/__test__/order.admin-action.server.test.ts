import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"

interface FindFirstArgs {
  readonly columns: Record<string, boolean>
  readonly where: SQL
}

const database = vi.hoisted(() => ({
  findFirst: vi.fn((args: unknown) => Promise.resolve(args)),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { query: { order: { findFirst: database.findFirst } } },
}))

const dialect = new SQLiteSyncDialect()

const findFirstArgs = (): FindFirstArgs => {
  const [args] = database.findFirst.mock.calls[0] ?? []

  if (args === null || typeof args !== "object" || !("where" in args) || !("columns" in args)) {
    throw new TypeError("findFirst was not called with a where clause and column selection")
  }

  const { columns, where } = args

  if (!(where instanceof SQL) || columns === null || typeof columns !== "object") {
    throw new TypeError("findFirst received an unexpected shape")
  }

  return { columns: { ...columns }, where }
}

describe("getAdminOrderActionRow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("selects only the status columns needed to guard an action", async () => {
    await getAdminOrderActionRow("order-1")

    expect(findFirstArgs().columns).toStrictEqual({ fulfillmentStatus: true, status: true })
  })

  it("looks the order up by its id", async () => {
    await getAdminOrderActionRow("order-1")

    const query = dialect.sqlToQuery(findFirstArgs().where)

    expect(query.sql).toBe('"order"."id" = ?')
    expect(query.params).toStrictEqual(["order-1"])
  })
})

describe("assertOrderActionState", () => {
  const row = { fulfillmentStatus: "not_fulfilled", status: "pending" } as const

  it("returns the row when the predicate accepts it", () => {
    expect(assertOrderActionState(row, () => true)).toBe(row)
  })

  it("passes the row snapshot to the predicate", () => {
    const predicate = vi.fn(() => true)

    assertOrderActionState(row, predicate)

    expect(predicate).toHaveBeenCalledWith(row)
  })

  it("throws a not found error for a missing row", () => {
    expect(() => assertOrderActionState(undefined, () => true)).toThrow(new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND))
  })

  it("never consults the predicate for a missing row", () => {
    const predicate = vi.fn(() => true)

    expect(() => assertOrderActionState(undefined, predicate)).toThrow(AppError)
    expect(predicate).not.toHaveBeenCalled()
  })

  it("throws a conflict error when the predicate rejects the state", () => {
    expect(() => assertOrderActionState(row, () => false)).toThrow(new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE))
  })

  it("tags the conflict with the invalid state code", () => {
    try {
      assertOrderActionState(row, () => false)
      expect.unreachable("assertOrderActionState should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect(error).toMatchObject({ code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE })
    }
  })
})

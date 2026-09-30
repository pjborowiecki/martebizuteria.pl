import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { prepareRefundBatch, resolveSettledOrder } from "~/src/modules/order/order.utils"
import { payment } from "~/src/modules/payment/payment.schema"

interface RecordedUpdate {
  readonly table: unknown
  readonly values: Record<string, unknown>
  readonly where: SQL
}

const database = vi.hoisted(() => ({ updates: [] as RecordedUpdate[] }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: SQL) => {
          const statement = { table, values, where }
          database.updates.push(statement)

          return statement
        },
      }),
    }),
  },
}))

const dialect = new SQLiteSyncDialect()

const updateAt = (index: number): RecordedUpdate => {
  const update = database.updates[index]

  if (update === undefined) {
    throw new Error(`No recorded update at position ${index}`)
  }

  return update
}

const asSql = (value: unknown): SQL => {
  if (!(value instanceof SQL)) {
    throw new TypeError("Expected a SQL expression")
  }

  return value
}

const settled: Order["settled"] = {
  checkoutId: "checkout-1",
  orderId: "order-1",
  paymentId: "payment-1",
  paymentStatus: "succeeded",
}

const refundInput = {
  fullyRefunded: true,
  refundedAmount: 1999,
  restock: true,
  transactionId: "pi_123",
}

describe("resolveSettledOrder", () => {
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleInfo.mockRestore()
  })

  it("returns undefined and reports the missing payment", () => {
    expect(resolveSettledOrder(undefined, { id: "order-1" }, "pi_123")).toBeUndefined()
    expect(consoleInfo).toHaveBeenCalledWith("No payment for transaction pi_123; nothing to update.")
  })

  it("projects the payment and order rows onto a settled order", () => {
    const resolved = resolveSettledOrder({ checkoutId: "checkout-1", id: "payment-1", status: "succeeded" }, { id: "order-1" }, "pi_123")

    expect(resolved).toStrictEqual({
      checkoutId: "checkout-1",
      orderId: "order-1",
      paymentId: "payment-1",
      paymentStatus: "succeeded",
    })
    expect(consoleInfo).not.toHaveBeenCalled()
  })

  it("keeps the payment when the order row is missing", () => {
    const resolved = resolveSettledOrder({ checkoutId: "checkout-1", id: "payment-1", status: "requires_capture" }, undefined, "pi_123")

    expect(resolved).toStrictEqual({
      checkoutId: "checkout-1",
      orderId: undefined,
      paymentId: "payment-1",
      paymentStatus: "requires_capture",
    })
  })
})

describe("prepareRefundBatch", () => {
  beforeEach(() => {
    database.updates = []
  })

  it("marks the payment refunded and the order refunded for a full refund", () => {
    const statements = prepareRefundBatch(settled, refundInput, [])

    expect(statements).toHaveLength(2)
    expect(updateAt(0).table).toBe(payment)
    expect(updateAt(0).values).toMatchObject({ refundedAmount: 1999, status: "refunded" })
    expect(updateAt(0).values["refundedAt"]).toBeInstanceOf(Date)
    expect(updateAt(1).table).toBe(order)
    expect(updateAt(1).values).toStrictEqual({ status: "refunded" })
  })

  it("leaves the payment succeeded and skips the order for a partial refund", () => {
    const statements = prepareRefundBatch(settled, { ...refundInput, fullyRefunded: false, refundedAmount: 500 }, [])

    expect(statements).toHaveLength(1)
    expect(updateAt(0).values).toMatchObject({ refundedAmount: 500, status: "succeeded" })
  })

  it("skips the order update when the settled order has no order id", () => {
    const statements = prepareRefundBatch({ ...settled, orderId: undefined }, refundInput, [])

    expect(statements).toHaveLength(1)
    expect(database.updates.map((update) => update.table)).toStrictEqual([payment])
  })

  it("adds one inventory increment per restock line", () => {
    prepareRefundBatch(settled, refundInput, [
      { quantity: 2, variantId: "variant-a" },
      { quantity: 5, variantId: "variant-b" },
    ])

    expect(database.updates.slice(2).map((update) => update.table)).toStrictEqual([inventory, inventory])
    expect(dialect.sqlToQuery(updateAt(2).where).params).toStrictEqual(["variant-a"])
    expect(dialect.sqlToQuery(updateAt(3).where).params).toStrictEqual(["variant-b"])
  })

  it("increments the available quantity relative to its current value", () => {
    prepareRefundBatch(settled, refundInput, [{ quantity: 3, variantId: "variant-a" }])

    const increment = dialect.sqlToQuery(asSql(updateAt(2).values["quantityAvailable"]))

    expect(increment.sql).toBe('"inventory"."quantity_available" + ?')
    expect(increment.params).toStrictEqual([3])
  })

  it("targets the refunded payment row", () => {
    prepareRefundBatch(settled, refundInput, [])

    const query = dialect.sqlToQuery(updateAt(0).where)

    expect(query.sql).toBe('"payment"."id" = ?')
    expect(query.params).toStrictEqual(["payment-1"])
  })
})

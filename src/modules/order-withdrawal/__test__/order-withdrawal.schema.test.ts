import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { orderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.schema"

const config = getTableConfig(orderWithdrawal)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("order_withdrawal table", () => {
  it("holds each statement's content, its order and the audit timestamps", () => {
    expect(config.name).toBe("order_withdrawal")
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "consumer_name",
      "email",
      "id",
      "items",
      "order_id",
      "reason",
      "scope",
      "created_at",
      "updated_at",
    ])
  })

  it("generates a uuid for a statement that arrives without an id", () => {
    const generated: unknown = columnByName.get("id")?.defaultFn?.()

    expect(columnByName.get("id")?.primary).toBe(true)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it.each(["consumer_name", "email", "order_id", "scope"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it.each(["items", "reason"])("leaves %s empty when the statement has none", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(false)
  })

  it("removes its statements only with the order and indexes them by order", () => {
    const [key] = config.foreignKeys
    const reference = key?.reference()

    expect(reference?.columns.map((column) => column.name)).toStrictEqual(["order_id"])
    expect(reference === undefined ? undefined : getTableName(reference.foreignTable)).toBe("order")
    expect(key?.onDelete).toBe("cascade")
    expect(config.indexes.map((index) => index.config.name)).toStrictEqual(["order_withdrawal_orderId_idx"])
  })
})

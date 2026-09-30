import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { payment } from "~/src/modules/payment/payment.schema"

const config = getTableConfig(payment)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("payment table", () => {
  it("maps to the payment table name", () => {
    expect(config.name).toBe("payment")
  })

  it("declares the amounts, the provider reference and the refund trail", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "amount",
      "checkout_id",
      "created_at",
      "currency",
      "id",
      "provider",
      "refunded_amount",
      "refunded_at",
      "status",
      "transaction_id",
      "updated_at",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(true)
  })

  it("requires an amount and a provider", () => {
    expect(columnByName.get("amount")?.notNull).toBe(true)
    expect(columnByName.get("amount")?.getSQLType()).toBe("integer")
    expect(columnByName.get("provider")?.notNull).toBe(true)
  })

  it("prices in the store currency unless told otherwise", () => {
    const currency = columnByName.get("currency")

    expect(currency?.notNull).toBe(true)
    expect(currency?.default).toBe("PLN")
  })

  it("accepts only the four payment states and starts pending", () => {
    const status = columnByName.get("status")

    expect(status?.enumValues).toStrictEqual(["pending", "succeeded", "failed", "refunded"])
    expect(status?.notNull).toBe(true)
    expect(status?.default).toBe("pending")
  })

  it("starts with nothing refunded and no refund timestamp", () => {
    expect(columnByName.get("refunded_amount")?.default).toBe(0)
    expect(columnByName.get("refunded_amount")?.notNull).toBe(true)
    expect(columnByName.get("refunded_at")?.notNull).toBe(false)
  })

  it("keeps the provider transaction id optional until the provider answers", () => {
    expect(columnByName.get("transaction_id")?.notNull).toBe(false)
  })

  it("drops the payment when its checkout is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["checkout_id"], foreignTable: "checkout", onDelete: "cascade" }])
  })

  it("indexes the checkout lookup and refuses to record one provider transaction twice", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["checkout_id"], name: "payment_checkoutId_idx", unique: false },
      { columns: ["transaction_id"], name: "payment_transactionId_unique", unique: true },
    ])
  })
})

it("generates a fresh UUID for every new row", () => {
  const generateId = columnByName.get("id")?.defaultFn
  const first: unknown = generateId?.()
  const second: unknown = generateId?.()
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  expect(second).not.toBe(first)
})

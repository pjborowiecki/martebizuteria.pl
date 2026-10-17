import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { userEmailHistory } from "~/src/modules/user-email-history/user-email-history.schema"

const config = getTableConfig(userEmailHistory)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("user_email_history table", () => {
  it("maps to the user_email_history table name", () => {
    expect(config.name).toBe("user_email_history")
  })

  it("stores which account used which address from when until when", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual(["added_at", "email", "id", "replaced_at", "user_id"])
  })

  it("orders an account's addresses by an integer key the database assigns as they are recorded", () => {
    expect(columnByName.get("id")?.primary).toBe(true)
    expect(columnByName.get("id")?.getSQLType()).toBe("integer")
  })

  it("requires the account, the address and when it was taken, and leaves the current address without an end", () => {
    expect(columnByName.get("user_id")?.notNull).toBe(true)
    expect(columnByName.get("email")?.notNull).toBe(true)
    expect(columnByName.get("added_at")?.notNull).toBe(true)
    expect(columnByName.get("replaced_at")?.notNull).toBe(false)
  })

  it("indexes the account and the address, and allows one current address per account", () => {
    expect(config.indexes.map(({ config: index }) => ({ name: index.name, unique: index.unique }))).toStrictEqual([
      { name: "user_email_history_userId_idx", unique: false },
      { name: "user_email_history_email_idx", unique: false },
      { name: "user_email_history_current_unique", unique: true },
    ])
  })

  it("goes with the account when it is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["user_id"], foreignTable: "user", onDelete: "cascade" }])
  })
})

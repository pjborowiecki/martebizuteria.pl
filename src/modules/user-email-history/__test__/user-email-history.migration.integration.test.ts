import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

const sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })

const ANNA_JOINED = Date.UTC(2026, 0, 1)

const FIRST_CHANGE = Date.UTC(2026, 2, 1)

const SECOND_CHANGE = Date.UTC(2026, 5, 1)

const BARTEK_JOINED = Date.UTC(2026, 1, 1)

const historyRowsSchema = z.array(
  z.object({ added_at: z.number(), email: z.string(), replaced_at: z.number().nullable(), user_id: z.string() }),
)

const historyOf = (userId: string) =>
  historyRowsSchema.parse(
    sqlite.prepare("select user_id, email, added_at, replaced_at from user_email_history where user_id = ? order by id").all(userId),
  )

const addresses = (userId: string) => historyOf(userId).map(({ email, replaced_at }) => ({ current: replaced_at === null, email }))

const insertEmailChange = ({ createdAt, detail, id, userId }: Readonly<EmailChangeEntry>): void => {
  sqlite
    .prepare(
      `insert into audit_log (id, action, actor_name, actor_role, category, created_at, detail, resource_id, severity, target)
       values (?, 'auth.email_changed', 'Anna', 'customer', 'auth', ?, ?, ?, 'warning', 'anna@example.test')`,
    )
    .run(id, createdAt, detail, userId)
}

interface EmailChangeEntry {
  readonly createdAt: number
  readonly detail: string | null
  readonly id: string
  readonly userId: string
}

beforeAll(() => {
  applyMigrationHistoryBefore(sqlite, MIGRATION.USER_EMAIL_HISTORY)
  sqlite.exec(`
    insert into user (id, name, email, created_at, updated_at) values
      ('anna', 'Anna', 'anna@example.test', ${String(ANNA_JOINED)}, 0),
      ('bartek', 'Bartek', 'Bartek@Example.test', ${String(BARTEK_JOINED)}, 0);
  `)
  insertEmailChange({ createdAt: SECOND_CHANGE, detail: "anna.work@example.test → anna@example.test", id: "anna-second", userId: "anna" })
  insertEmailChange({ createdAt: FIRST_CHANGE, detail: "Anna.Old@example.test → anna.work@example.test", id: "anna-first", userId: "anna" })
  insertEmailChange({ createdAt: SECOND_CHANGE, detail: null, id: "admin-edit", userId: "bartek" })
  insertEmailChange({ createdAt: SECOND_CHANGE, detail: "no arrow here", id: "unreadable", userId: "bartek" })
  insertEmailChange({ createdAt: SECOND_CHANGE, detail: "gone@example.test → gone2@example.test", id: "deleted-account", userId: "gone" })
  applyMigration(sqlite, MIGRATION.USER_EMAIL_HISTORY)
})

afterAll(() => {
  sqlite.close()
})

describe("the user email history migration", () => {
  it("rebuilds the addresses an account used from the changes the audit log still holds, oldest first", () => {
    expect(historyOf("anna")).toStrictEqual([
      { added_at: ANNA_JOINED, email: "anna.old@example.test", replaced_at: FIRST_CHANGE, user_id: "anna" },
      { added_at: FIRST_CHANGE, email: "anna.work@example.test", replaced_at: SECOND_CHANGE, user_id: "anna" },
      { added_at: SECOND_CHANGE, email: "anna@example.test", replaced_at: null, user_id: "anna" },
    ])
  })

  it("records an account with no readable change under its current address from the day it was created", () => {
    expect(historyOf("bartek")).toStrictEqual([
      { added_at: BARTEK_JOINED, email: "bartek@example.test", replaced_at: null, user_id: "bartek" },
    ])
  })

  it("keeps nothing for an account that no longer exists", () => {
    expect(historyOf("gone")).toStrictEqual([])
  })

  it("records the address of a new account from the moment it was created", () => {
    sqlite.exec(`insert into user (id, name, email, created_at, updated_at) values ('celina', 'Celina', 'Celina@Example.test', 5000, 5000)`)

    expect(historyOf("celina")).toStrictEqual([{ added_at: 5000, email: "celina@example.test", replaced_at: null, user_id: "celina" }])
  })

  it("closes the old address and opens the new one in the same statement that changes it", () => {
    sqlite.exec(`insert into user (id, name, email, created_at, updated_at) values ('dorota', 'Dorota', 'dorota@example.test', 0, 0)`)
    const before = Date.now()

    sqlite.exec(`update user set email = 'dorota@new.example' where id = 'dorota'`)

    const [old, current] = historyOf("dorota")
    expect(old?.replaced_at).toBe(current?.added_at)
    expect(current?.added_at).toBeGreaterThanOrEqual(before - 1000)
    expect(addresses("dorota")).toStrictEqual([
      { current: false, email: "dorota@example.test" },
      { current: true, email: "dorota@new.example" },
    ])
  })

  it("ignores updates that leave the address alone or only change its letter case", () => {
    sqlite.exec(`insert into user (id, name, email, created_at, updated_at) values ('ewa', 'Ewa', 'ewa@example.test', 0, 0)`)

    sqlite.exec(`update user set name = 'Ewa K.' where id = 'ewa'`)
    sqlite.exec(`update user set email = 'EWA@example.test' where id = 'ewa'`)

    expect(addresses("ewa")).toStrictEqual([{ current: true, email: "ewa@example.test" }])
  })

  it("keeps an address the account returns to as a new period of its own", () => {
    sqlite.exec(`insert into user (id, name, email, created_at, updated_at) values ('filip', 'Filip', 'filip@example.test', 0, 0)`)

    sqlite.exec(`update user set email = 'filip@new.example' where id = 'filip'`)
    sqlite.exec(`update user set email = 'filip@example.test' where id = 'filip'`)

    expect(addresses("filip")).toStrictEqual([
      { current: false, email: "filip@example.test" },
      { current: false, email: "filip@new.example" },
      { current: true, email: "filip@example.test" },
    ])
  })

  it("allows only one current address per account", () => {
    expect(() => {
      sqlite.exec(`insert into user_email_history (user_id, email, added_at) values ('anna', 'second@example.test', 0)`)
    }).toThrow(/UNIQUE constraint failed/u)
  })

  it("deletes an account's addresses with the account", () => {
    sqlite.exec(`delete from user where id = 'celina'`)

    expect(historyOf("celina")).toStrictEqual([])
  })
})

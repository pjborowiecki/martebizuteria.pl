import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"

const sqlite = new DatabaseSync(":memory:")

const REVISED_AT = Date.parse("2026-10-10T12:00:00.000Z")

const SENTENCES = {
  "en-US": {
    ended: "Deleting your account also ends the subscription for the account's e-mail address and removes that address from our list.",
    kept: "The subscription does not depend on an account, so deleting your account does not end it.",
  },
  "pl-PL": {
    ended: "Usunięcie konta kończy też subskrypcję na adres e-mail konta i usuwa ten adres z naszej listy.",
    kept: "Subskrypcja nie zależy od konta, więc usunięcie konta jej nie kończy.",
  },
} as const

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

const policySchema = z.object({ bodies: z.string(), revisedAts: z.string(), updatedAt: z.number() })

const readPolicy = () => {
  const row = policySchema.parse(
    sqlite
      .prepare("select bodies, revised_ats as revisedAts, updated_at as updatedAt from content_page where handle = ?")
      .get(CONTENT_PAGE_HANDLE.PRIVACY_POLICY),
  )

  return {
    bodies: z.record(z.enum(LOCALES), z.string()).parse(JSON.parse(row.bodies)),
    revisedAts: z.record(z.enum(LOCALES), z.number()).parse(JSON.parse(row.revisedAts)),
    updatedAt: row.updatedAt,
  }
}

const writeBody = (locale: Locale, body: string): void => {
  sqlite
    .prepare("update content_page set bodies = json_set(bodies, ?, ?) where handle = ?")
    .run(`$."${locale}"`, body, CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
}

beforeEach(() => {
  sqlite.exec("drop table if exists content_page")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  applyMigration(sqlite, MIGRATION.TERMS_OF_SERVICE_PAGE)
  applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)
  applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)
})

afterAll(() => {
  sqlite.close()
})

describe("the privacy policy migration for account deletion", () => {
  it.each(LOCALES)("says in %s that deleting the account ends the newsletter subscription, and nothing else changes", (locale) => {
    const before = readPolicy().bodies[locale]

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)

    expect(before).toContain(SENTENCES[locale].kept)
    expect(readPolicy().bodies[locale]).toBe(before.replace(SENTENCES[locale].kept, SENTENCES[locale].ended))
  })

  it("dates the revision in both languages", () => {
    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)

    expect(readPolicy()).toMatchObject({ revisedAts: { "en-US": REVISED_AT, "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
  })

  it("leaves a language alone once the owner has rewritten that sentence", () => {
    writeBody("pl-PL", "## Prywatność\n\nTreść właściciela.")
    const before = readPolicy()

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)

    const after = readPolicy()
    expect(after.bodies["pl-PL"]).toBe("## Prywatność\n\nTreść właściciela.")
    expect(after.revisedAts["pl-PL"]).toBe(before.revisedAts["pl-PL"])
    expect(after.bodies["en-US"]).toContain(SENTENCES["en-US"].ended)
  })

  it("changes nothing when it runs again", () => {
    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)
    sqlite.prepare("update content_page set updated_at = 1 where handle = ?").run(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    const before = readPolicy()

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)

    expect(readPolicy()).toStrictEqual(before)
  })
})

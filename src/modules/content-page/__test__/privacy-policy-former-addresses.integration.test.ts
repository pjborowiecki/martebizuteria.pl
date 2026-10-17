import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"

const database = { sqlite: new DatabaseSync(":memory:") }

const REVISED_AT = Date.parse("2026-10-17T12:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

const PASSAGES: Record<Locale, Readonly<{ added: string; after: string }>> = {
  "en-US": {
    added:
      "You can change your account's e-mail address in its settings. The change takes effect only once you confirm it with the links we send to the current and the new address, and afterwards we let the previous address know that it was changed. We keep the previous addresses in your account together with the dates from and until which they were used, so that orders, payments and events from the time an address was in use stay with your account instead of reaching whoever uses that address later, and to protect the account from takeover (Article 6(1)(b) and (f) GDPR). Messages about orders placed with a previous address, any newsletter subscription and the address in your Stripe customer profile move to the new address. We delete the previous addresses together with the account.",
    after:
      "Once you confirm your e-mail address, we link to your account the orders placed earlier without signing in under the same address and any newsletter subscription for that address.",
  },
  "pl-PL": {
    added:
      "Adres e-mail konta możesz zmienić w jego ustawieniach. Zmiana następuje dopiero po potwierdzeniu jej linkami wysłanymi na dotychczasowy i na nowy adres, a na dotychczasowy adres wysyłamy potem informację, że adres został zmieniony. Poprzednie adresy przechowujemy w koncie razem z datami, od kiedy i do kiedy były używane, aby zamówienia, płatności i zdarzenia z czasu, gdy używany był dany adres, pozostały przy Twoim koncie, a nie trafiły do osoby, która później zacznie używać tego adresu, oraz aby chronić konto przed przejęciem (art. 6 ust. 1 lit. b i f RODO). Wiadomości o zamówieniach złożonych z poprzedniego adresu, subskrypcję newslettera i adres w Twoim profilu klienta w Stripe przenosimy na nowy adres. Poprzednie adresy usuwamy razem z kontem.",
    after:
      "Po potwierdzeniu adresu e-mail łączymy z kontem zamówienia złożone wcześniej bez logowania na ten sam adres oraz subskrypcję newslettera na ten adres.",
  },
}

const policySchema = z.object({ bodies: z.string(), revisedAts: z.string(), updatedAt: z.number() })

const readPolicy = () => {
  const row = policySchema.parse(
    database.sqlite
      .prepare("select bodies, revised_ats as revisedAts, updated_at as updatedAt from content_page where handle = ?")
      .get(CONTENT_PAGE_HANDLE.PRIVACY_POLICY),
  )

  return {
    bodies: z.record(z.enum(LOCALES), z.string()).parse(JSON.parse(row.bodies)),
    revisedAts: z.record(z.enum(LOCALES), z.number()).parse(JSON.parse(row.revisedAts)),
    updatedAt: row.updatedAt,
  }
}

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  applyMigrationHistoryBefore(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)
})

afterEach(() => {
  database.sqlite.close()
})

describe("the privacy policy migration about former e-mail addresses", () => {
  it.each(LOCALES)("adds the paragraph on changing the account's address after the one on confirming it in the %s policy", (locale) => {
    const before = readPolicy().bodies[locale]
    const { added, after } = PASSAGES[locale]

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)

    expect(before).toContain(after)
    expect(readPolicy().bodies[locale]).toBe(before.replace(after, `${after}\n\n${added}`))
  })

  it("dates the revision in both languages", () => {
    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)

    expect(readPolicy()).toMatchObject({ revisedAts: { "en-US": REVISED_AT, "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
  })

  it("leaves a language alone once the owner has rewritten it", () => {
    database.sqlite
      .prepare("update content_page set bodies = json_set(bodies, ?, ?) where handle = ?")
      .run('$."pl-PL"', "## Prywatność\n\nTreść właściciela.", CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    const before = readPolicy()

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)

    const after = readPolicy()
    expect(after.bodies["pl-PL"]).toBe("## Prywatność\n\nTreść właściciela.")
    expect(after.revisedAts["pl-PL"]).toBe(before.revisedAts["pl-PL"])
    expect(after.revisedAts["en-US"]).toBe(REVISED_AT)
  })

  it("changes nothing when it runs again", () => {
    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)
    database.sqlite.prepare("update content_page set updated_at = 1 where handle = ?").run(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    const before = readPolicy()

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_FORMER_ADDRESSES)

    expect(readPolicy()).toStrictEqual(before)
  })
})

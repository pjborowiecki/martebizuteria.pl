import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE, type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"

const sqlite = new DatabaseSync(":memory:")

const REVISED_AT = Date.parse("2026-10-10T12:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

const pageSchema = z.object({ bodies: z.string(), revisedAts: z.string(), updatedAt: z.number() })

const readPage = (handle: ContentPageHandle) => {
  const row = pageSchema.parse(
    sqlite.prepare("select bodies, revised_ats as revisedAts, updated_at as updatedAt from content_page where handle = ?").get(handle),
  )

  return {
    bodies: z.record(z.enum(LOCALES), z.string()).parse(JSON.parse(row.bodies)),
    revisedAts: z.record(z.enum(LOCALES), z.number()).parse(JSON.parse(row.revisedAts)),
    updatedAt: row.updatedAt,
  }
}

const writeBody = (handle: ContentPageHandle, locale: Locale, body: string): void => {
  sqlite.prepare("update content_page set bodies = json_set(bodies, ?, ?) where handle = ?").run(`$."${locale}"`, body, handle)
}

const RETURNS_STEPS: Record<Locale, { readonly before: string; readonly after: string }> = {
  "en-US": {
    after:
      '1. Withdraw [with the form on our website](/withdraw-from-contract), giving your order number and the e-mail address you ordered with, or with the "Withdraw from the contract" button on the order in your account. You can also send us a statement that you are withdrawing from the contract, by e-mail to',
    before: "1. Send us a statement that you are withdrawing from the contract, by e-mail to",
  },
  "pl-PL": {
    after:
      "1. Odstąp od umowy [przez formularz na naszej stronie](/withdraw-from-contract), podając numer zamówienia i adres e-mail użyty przy zamówieniu, albo przyciskiem „Odstąp od umowy” przy zamówieniu w panelu klienta. Możesz też wysłać nam oświadczenie o odstąpieniu od umowy e-mailem na adres",
    before: "1. Wyślij nam oświadczenie o odstąpieniu od umowy e-mailem na adres",
  },
}

const TERMS_SENTENCES: Record<Locale, { readonly before: string; readonly after: string }> = {
  "en-US": {
    after:
      'in particular with the ["Withdraw from the contract"](/withdraw-from-contract) function in the Shop, which is also available on the Order in the Account, by e-mail to',
    before: "The Consumer withdraws from the contract by making a statement to the Seller, in particular by e-mail to",
  },
  "pl-PL": {
    after:
      "w szczególności za pomocą funkcji [„Odstąp od umowy”](/withdraw-from-contract) w Sklepie, dostępnej także przy Zamówieniu na Koncie, e-mailem na adres",
    before: "Konsument odstępuje od umowy, składając Sprzedawcy oświadczenie, w szczególności e-mailem na adres",
  },
}

const PRIVACY_STATEMENTS: Record<Locale, { readonly before: readonly string[]; readonly after: readonly string[] }> = {
  "en-US": {
    after: [
      "tells people from bots when you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number;",
      "When you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number, the Cloudflare Turnstile check loads",
      "a password reset link, a newsletter confirmation or the acknowledgement of a withdrawal made by order number sent to one address",
    ],
    before: ["subscribe to the newsletter and go to payment", "a password reset link or a newsletter confirmation sent to one address"],
  },
  "pl-PL": {
    after: [
      "odróżnia ludzi od botów przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia;",
      "Przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia ładuje się weryfikacja Cloudflare Turnstile",
      "linkiem do resetu hasła, potwierdzeniem zapisu do newslettera albo potwierdzeniem odstąpienia od umowy złożonego z użyciem numeru zamówienia wysyłanych na jeden adres",
    ],
    before: [
      "zapisie do newslettera i przejściu do płatności",
      "linkiem do resetu hasła albo potwierdzeniem zapisu do newslettera wysyłanych na jeden adres",
    ],
  },
}

const ALL_PAGES = [
  CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
  CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
  CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE,
] as const

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

describe("the withdrawal function links migration", () => {
  it.each(LOCALES)("leads the returns page's steps in %s with the online withdrawal form", (locale) => {
    const before = readPage(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS).bodies[locale]

    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    const after = readPage(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS).bodies[locale]
    expect(before).toContain(RETURNS_STEPS[locale].before)
    expect(after).toContain(RETURNS_STEPS[locale].after)
    expect(after.replaceAll(RETURNS_STEPS[locale].after, "")).not.toContain(RETURNS_STEPS[locale].before)
  })

  it("says in English that only the PDF forms are in Polish", () => {
    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    expect(readPage(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS).bodies["en-US"]).toContain(
      "**The PDF withdrawal and complaint forms linked below are in Polish.**",
    )
  })

  it.each(LOCALES)("names the withdrawal function in § 8 of the terms in %s", (locale) => {
    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    const terms = readPage(CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE).bodies[locale]
    expect(terms).toContain(TERMS_SENTENCES[locale].after)
    expect(terms).not.toContain(TERMS_SENTENCES[locale].before)
  })

  it.each(LOCALES)("names the withdrawal by order number among the privacy policy's bot checks and counted e-mails in %s", (locale) => {
    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    const policy = readPage(CONTENT_PAGE_HANDLE.PRIVACY_POLICY).bodies[locale]
    for (const statement of PRIVACY_STATEMENTS[locale].after) {
      expect(policy).toContain(statement)
    }
    for (const statement of PRIVACY_STATEMENTS[locale].before) {
      expect(policy).not.toContain(statement)
    }
  })

  it("leaves the privacy policy alone in a language whose bot-check sentence the owner rewrote", () => {
    writeBody(CONTENT_PAGE_HANDLE.PRIVACY_POLICY, "en-US", "## Privacy\n\nThe owner's text.")
    const before = readPage(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)

    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    const after = readPage(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    expect(after.bodies["en-US"]).toBe("## Privacy\n\nThe owner's text.")
    expect(after.revisedAts["en-US"]).toBe(before.revisedAts["en-US"])
    expect(after.revisedAts["pl-PL"]).toBe(REVISED_AT)
  })

  it("dates every revision in both languages", () => {
    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    for (const handle of ALL_PAGES) {
      expect(readPage(handle)).toMatchObject({ revisedAts: { "en-US": REVISED_AT, "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
    }
  })

  it("leaves a language alone once the owner has rewritten its sentence", () => {
    writeBody(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, "pl-PL", "## Zwroty\n\nTreść właściciela.")
    const before = readPage(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS)

    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    const after = readPage(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS)
    expect(after.bodies["pl-PL"]).toBe("## Zwroty\n\nTreść właściciela.")
    expect(after.revisedAts["pl-PL"]).toBe(before.revisedAts["pl-PL"])
    expect(after.bodies["en-US"]).toContain(RETURNS_STEPS["en-US"].after)
  })

  it("changes nothing when it runs again", () => {
    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)
    sqlite.exec("update content_page set updated_at = 1")
    const before = ALL_PAGES.map((handle) => readPage(handle))

    applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)

    expect(ALL_PAGES.map((handle) => readPage(handle))).toStrictEqual(before)
  })
})

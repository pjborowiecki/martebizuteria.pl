import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"

const database = { sqlite: new DatabaseSync(":memory:") }

const REVISED_AT = Date.parse("2026-10-17T12:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

interface Phrase {
  readonly after: string
  readonly before: string
}

const PHRASES: readonly Phrase[] = [
  { after: "historia Zamówień Klienta", before: "historia jego Zamówień" },
  { after: "Klient z Kontem", before: "Klient posiadający Konto" },
  { after: "za zgodą Klienta na podany adres e-mail", before: "na adres e-mail Klienta za jego zgodą" },
  {
    after: "Należy chronić swoje urządzenie i hasło oraz sprawdzać, czy adres Sklepu jest właściwy",
    before: "Klient powinien chronić swoje urządzenie i hasło oraz sprawdzać, czy korzysta z właściwego adresu Sklepu",
  },
  { after: "z chwilą wydania Produktu Konsumentowi", before: "z chwilą wydania mu Produktu" },
  {
    after:
      "Termin biegnie od dnia objęcia Produktu w posiadanie przez Konsumenta lub wskazaną przez Konsumenta osobę trzecią inną niż przewoźnik.",
    before:
      "Termin biegnie od dnia, w którym Konsument lub wskazana przez niego osoba trzecia inna niż przewoźnik objęła Produkt w posiadanie.",
  },
  { after: "wszystkie dokonane przez Konsumenta płatności", before: "wszystkie otrzymane od niego płatności" },
  { after: "W razie wyboru przez Konsumenta sposobu dostawy innego niż", before: "Jeżeli Konsument wybrał sposób dostawy inny niż" },
  {
    after:
      "jakiego użyto przy płatności za Zamówienie, chyba że Konsument wyraźnie zgodzi się na inny sposób zwrotu, który nie wiąże się dla Konsumenta z żadnymi kosztami.",
    before:
      "jakiego użył Konsument, chyba że Konsument wyraźnie zgodził się na inny sposób zwrotu, który nie wiąże się dla niego z żadnymi kosztami.",
  },
  { after: "od dnia odstąpienia od umowy", before: "od dnia, w którym odstąpił od umowy" },
  { after: "zaspokojeniu zindywidualizowanych potrzeb Konsumenta", before: "zaspokojeniu jego zindywidualizowanych potrzeb" },
  {
    after:
      "nie pozbawia Konsumenta ochrony, jaką zapewniają przepisy, których nie można wyłączyć w drodze umowy, prawa państwa zwykłego pobytu Konsumenta.",
    before:
      "nie pozbawia Konsumenta ochrony przyznanej mu przez przepisy, których nie można wyłączyć w drodze umowy, prawa państwa, w którym ma on zwykłe miejsce pobytu.",
  },
  { after: "Jeżeli Klient nie akceptuje zmian, może", before: "Klient, który nie akceptuje zmian, może" },
]

const GENDERED_FORMS = [
  "Klient posiadający",
  "jego Zamówień",
  "za jego zgodą",
  "Klient powinien",
  "wydania mu",
  "przez niego",
  "od niego",
  "dla niego",
  "użył Konsument",
  "zgodził się",
  "odstąpił",
  "jego zindywidualizowanych",
  "przyznanej mu",
  "ma on",
  "Klient, który",
]

const termsSchema = z.object({ bodies: z.string(), revisedAts: z.string(), updatedAt: z.number() })

const readTerms = () => {
  const row = termsSchema.parse(
    database.sqlite
      .prepare("select bodies, revised_ats as revisedAts, updated_at as updatedAt from content_page where handle = ?")
      .get(CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE),
  )

  return {
    bodies: z.record(z.enum(LOCALES), z.string()).parse(JSON.parse(row.bodies)),
    revisedAts: z.record(z.enum(LOCALES), z.number()).parse(JSON.parse(row.revisedAts)),
    updatedAt: row.updatedAt,
  }
}

const writeBody = (locale: Locale, body: string): void => {
  database.sqlite
    .prepare("update content_page set bodies = json_set(bodies, ?, ?) where handle = ?")
    .run(`$."${locale}"`, body, CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE)
}

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  applyMigrationHistoryBefore(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)
})

afterEach(() => {
  database.sqlite.close()
})

describe("the terms of service migration without gendered forms", () => {
  it("replaces exactly the gendered phrases in the Polish terms, and nothing else changes", () => {
    const before = readTerms()

    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    for (const phrase of PHRASES) {
      expect(before.bodies["pl-PL"]).toContain(phrase.before)
    }
    expect(readTerms().bodies).toStrictEqual({
      "en-US": before.bodies["en-US"],
      "pl-PL": PHRASES.reduce((body, phrase) => body.replaceAll(phrase.before, phrase.after), before.bodies["pl-PL"]),
    })
  })

  it("leaves no gendered form for the customer in the Polish terms", () => {
    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    for (const form of GENDERED_FORMS) {
      expect(readTerms().bodies["pl-PL"]).not.toContain(form)
    }
  })

  it("dates the revision of the Polish terms only", () => {
    const before = readTerms()

    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    expect(readTerms()).toMatchObject({ revisedAts: { "en-US": before.revisedAts["en-US"], "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
  })

  it("leaves terms the owner has rewritten alone", () => {
    writeBody("pl-PL", "## Regulamin\n\nTreść właściciela.")
    const before = readTerms()

    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    expect(readTerms()).toStrictEqual(before)
  })

  it("changes only the phrases an edited body still holds", () => {
    writeBody("pl-PL", "Klient posiadający Konto może zapisać kartę. Klient powinien dbać o hasło.")

    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    expect(readTerms().bodies["pl-PL"]).toBe("Klient z Kontem może zapisać kartę. Klient powinien dbać o hasło.")
  })

  it("changes nothing when it runs again", () => {
    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)
    database.sqlite.prepare("update content_page set updated_at = 1 where handle = ?").run(CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE)
    const before = readTerms()

    applyMigration(database.sqlite, MIGRATION.TERMS_OF_SERVICE_NEUTRAL_WORDING)

    expect(readTerms()).toStrictEqual(before)
  })
})

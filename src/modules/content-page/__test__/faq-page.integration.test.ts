import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"
import { WISHLIST_MAX_ITEMS } from "~/src/modules/wishlist/wishlist.constants"

const sqlite = new DatabaseSync(":memory:")

const PUBLISHED_AT = Date.parse("2026-10-10T14:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

const localeMap = <TValue extends z.ZodType>(value: TValue) => z.record(z.enum(LOCALES), value)

const rowSchema = z.object({
  bodies: z.string(),
  descriptions: z.string(),
  revisedAts: z.string(),
  titles: z.string(),
  updatedAt: z.number(),
})

const readFaq = () => {
  const row = rowSchema.parse(
    sqlite
      .prepare("select bodies, descriptions, revised_ats as revisedAts, titles, updated_at as updatedAt from content_page where handle = ?")
      .get(CONTENT_PAGE_HANDLE.FAQ),
  )

  return {
    bodies: localeMap(z.string()).parse(JSON.parse(row.bodies)),
    descriptions: localeMap(z.string()).parse(JSON.parse(row.descriptions)),
    revisedAts: localeMap(z.number()).parse(JSON.parse(row.revisedAts)),
    titles: localeMap(z.string()).parse(JSON.parse(row.titles)),
    updatedAt: row.updatedAt,
  }
}

const SECTIONS = {
  "en-US": [
    "## Orders",
    "## Payment and invoices",
    "## Delivery",
    "## Returns and complaints",
    "## Account",
    "## Newsletter",
    "## Jewellery care",
  ],
  "pl-PL": [
    "## Zamówienia",
    "## Płatności i faktury",
    "## Dostawa",
    "## Zwroty i reklamacje",
    "## Konto",
    "## Newsletter",
    "## Pielęgnacja biżuterii",
  ],
} as const satisfies Record<(typeof LOCALES)[number], readonly string[]>

const FACTS = {
  "en-US": [
    'click "Order & Pay" and pay',
    "By payment card, BLIK or Przelewy24.",
    "we do not offer payment on delivery",
    'tick "I want an invoice for a company"',
    "Only to addresses in Poland.",
    "it is up to 10 business days",
    "within up to 4 business days of dispatch",
    "In-person collection is free of charge.",
    "within 14 days of receiving the product",
    "within 2 years of delivery",
    "We pay the cost of sending the product to us and back.",
    `a wishlist of up to ${String(WISHLIST_MAX_ITEMS)} products`,
    "Until you confirm it, we do not send you the newsletter.",
  ],
  "pl-PL": [
    "kliknij „Zamawiam i płacę” i zapłać",
    "Kartą płatniczą, BLIK-iem albo przez Przelewy24.",
    "nie oferujemy płatności przy odbiorze przesyłki",
    "zaznacz w kasie „Chcę otrzymać fakturę na firmę”",
    "Wyłącznie na adresy w Polsce.",
    "wynosi do 10 dni roboczych",
    "trwa potem do 4 dni roboczych od nadania przesyłki",
    "Odbiór osobisty jest bezpłatny.",
    "w ciągu 14 dni od odbioru produktu",
    "w ciągu 2 lat od jego dostarczenia",
    "Koszt przesłania reklamowanego produktu do nas i z powrotem ponosimy my.",
    `listę życzeń z maksymalnie ${String(WISHLIST_MAX_ITEMS)} produktami`,
    "Dopóki jej nie potwierdzisz, nie wysyłamy newslettera.",
  ],
} as const satisfies Record<(typeof LOCALES)[number], readonly string[]>

beforeEach(() => {
  sqlite.exec("drop table if exists content_page")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  applyMigration(sqlite, MIGRATION.FAQ_PAGE)
})

afterAll(() => {
  sqlite.close()
})

describe("the FAQ migration", () => {
  it("publishes the FAQ in both languages and dates it", () => {
    expect(readFaq()).toMatchObject({
      revisedAts: { "en-US": PUBLISHED_AT, "pl-PL": PUBLISHED_AT },
      titles: { "en-US": "Frequently asked questions", "pl-PL": "Najczęściej zadawane pytania" },
      updatedAt: PUBLISHED_AT,
    })
  })

  it.each(LOCALES)("answers the %s questions in sections from ordering to jewellery care", (locale) => {
    const sections = readFaq()
      .bodies[locale].split("\n")
      .filter((line) => line.startsWith("## "))

    expect(sections).toStrictEqual(SECTIONS[locale])
  })

  it.each(LOCALES)("states in %s only what the checkout and the terms establish", (locale) => {
    const body = readFaq().bodies[locale]

    for (const fact of FACTS[locale]) {
      expect(body).toContain(fact)
    }
  })

  it.each(LOCALES)("leaves the %s prices of courier and locker delivery to the checkout", (locale) => {
    expect(readFaq().bodies[locale]).not.toMatch(/\d+[,.]\d{2}\s?(?:zł|PLN)/u)
  })

  it.each(LOCALES)("links the %s FAQ to the terms, the returns page, the withdrawal form and the complaint form", (locale) => {
    const body = readFaq().bodies[locale]

    for (const path of ["/terms-of-service", "/exchanges-and-returns", "/withdraw-from-contract", "/forms/formularz_reklamacji.pdf"]) {
      expect(body).toContain(`](${path})`)
    }
  })

  it("seeds text the admin editor accepts unchanged", () => {
    const { bodies, descriptions, titles } = readFaq()

    expect(
      contentPageZodSchemas.updateInput.parse({
        bodies,
        descriptions,
        expectedUpdatedAt: new Date(PUBLISHED_AT),
        handle: CONTENT_PAGE_HANDLE.FAQ,
        titles,
      }),
    ).toMatchObject({ bodies, descriptions, titles })
  })

  it("keeps an FAQ an admin has edited when it runs again", () => {
    sqlite
      .prepare("update content_page set bodies = json_set(bodies, '$.\"pl-PL\"', ?), updated_at = ? where handle = ?")
      .run("## Pytania\n\nTreść właściciela.", PUBLISHED_AT + 1, CONTENT_PAGE_HANDLE.FAQ)

    applyMigration(sqlite, MIGRATION.FAQ_PAGE)

    expect(readFaq()).toMatchObject({ bodies: { "pl-PL": "## Pytania\n\nTreść właściciela." }, updatedAt: PUBLISHED_AT + 1 })
  })
})

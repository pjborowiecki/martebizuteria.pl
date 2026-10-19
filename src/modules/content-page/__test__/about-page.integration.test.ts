import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { findSellerPlaceholders } from "~/src/modules/content-page/content-page.utils"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"

const sqlite = new DatabaseSync(":memory:")

const PUBLISHED_AT = Date.parse("2026-10-18T10:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

const localeMap = <TValue extends z.ZodType>(value: TValue) => z.record(z.enum(LOCALES), value)

const rowSchema = z.object({
  bodies: z.string(),
  descriptions: z.string(),
  revisedAts: z.string(),
  titles: z.string(),
  updatedAt: z.number(),
})

const readAbout = () => {
  const row = rowSchema.parse(
    sqlite
      .prepare("select bodies, descriptions, revised_ats as revisedAts, titles, updated_at as updatedAt from content_page where handle = ?")
      .get(CONTENT_PAGE_HANDLE.ABOUT),
  )

  return {
    bodies: localeMap(z.string()).parse(JSON.parse(row.bodies)),
    descriptions: localeMap(z.string()).parse(JSON.parse(row.descriptions)),
    revisedAts: localeMap(z.number()).parse(JSON.parse(row.revisedAts)),
    titles: localeMap(z.string()).parse(JSON.parse(row.titles)),
    updatedAt: row.updatedAt,
  }
}

const PUBLISHED_COPY = {
  "en-US": {
    description: "M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978.",
    paragraphs: [
      "We make forms in silver and gold, joining a classical approach to jewellery with plain, raw design. We reach for natural minerals and stones, but we never look for the obvious combination.",
      "For us jewellery is more than an accessory. It is a way to show your character, your mood and your own style. That is why at M'ARTE you will not find the classic, popular models you can see everywhere. We make things for people who want to choose on their own terms.",
      "We like simple forms, the imperfections of natural materials, and designs that grow more personal with time.",
      "We also believe the best pieces come about when they can be fitted to a person. That is why we make bespoke jewellery to order as well — from personalised prints to your own ideas and unusual forms.",
    ],
    title: "About M'Arte",
  },
  "pl-PL": {
    description: "M'ARTE to biżuteria tworzona w Bochni w pracowni jubilerskiej, która działa na rynku od 1978 roku.",
    paragraphs: [
      "Tworzymy srebrne i złote formy, łącząc klasyczne podejście do biżuterii z prostym, surowym designem. Sięgamy po naturalne minerały i kamienie, ale nie szukamy oczywistych połączeń.",
      "Dla nas biżuteria to coś więcej niż dodatek. To sposób na pokazanie swojego charakteru, nastroju i własnego stylu. Dlatego w M'ARTE nie znajdziesz klasycznych, popularnych modeli, które można zobaczyć wszędzie. Tworzymy rzeczy dla osób, które chcą wybierać po swojemu.",
      "Lubimy proste formy, niedoskonałości naturalnych materiałów i projekty, które z czasem stają się jeszcze bardziej osobiste.",
      "Wierzymy też, że najlepsze projekty powstają wtedy, gdy można je dopasować do człowieka. Dlatego tworzymy również indywidualną biżuterię na zamówienie — od personalizowanych odcisków po własne pomysły i nietypowe formy.",
    ],
    title: "O M'Arte",
  },
} as const satisfies Record<(typeof LOCALES)[number], { description: string; paragraphs: readonly string[]; title: string }>

beforeEach(() => {
  sqlite.exec("drop table if exists content_page")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  applyMigration(sqlite, MIGRATION.ABOUT_PAGE)
})

afterAll(() => {
  sqlite.close()
})

describe("the About page migration", () => {
  it("publishes the About page in both languages and dates it", () => {
    expect(readAbout()).toMatchObject({
      revisedAts: { "en-US": PUBLISHED_AT, "pl-PL": PUBLISHED_AT },
      updatedAt: PUBLISHED_AT,
    })
  })

  it.each(LOCALES)("moves the %s title, lead and four paragraphs of the page word for word", (locale) => {
    const page = readAbout()

    expect(page.titles[locale]).toBe(PUBLISHED_COPY[locale].title)
    expect(page.descriptions[locale]).toBe(PUBLISHED_COPY[locale].description)
    expect(page.bodies[locale]).toBe(PUBLISHED_COPY[locale].paragraphs.join("\n\n"))
  })

  it.each(LOCALES)("names no store detail in the %s story, so a change in Settings never re-dates it", (locale) => {
    expect(findSellerPlaceholders(readAbout().bodies[locale])).toStrictEqual([])
  })

  it("seeds text the admin editor accepts unchanged", () => {
    const { bodies, descriptions, titles } = readAbout()

    expect(
      contentPageZodSchemas.updateInput.parse({
        bodies,
        descriptions,
        expectedUpdatedAt: new Date(PUBLISHED_AT),
        handle: CONTENT_PAGE_HANDLE.ABOUT,
        titles,
      }),
    ).toMatchObject({ bodies, descriptions, titles })
  })

  it("keeps an About page an admin has edited when it runs again", () => {
    sqlite
      .prepare("update content_page set bodies = json_set(bodies, '$.\"pl-PL\"', ?), updated_at = ? where handle = ?")
      .run("Nasza historia.", PUBLISHED_AT + 1, CONTENT_PAGE_HANDLE.ABOUT)

    applyMigration(sqlite, MIGRATION.ABOUT_PAGE)

    expect(readAbout()).toMatchObject({ bodies: { "pl-PL": "Nasza historia." }, updatedAt: PUBLISHED_AT + 1 })
  })
})

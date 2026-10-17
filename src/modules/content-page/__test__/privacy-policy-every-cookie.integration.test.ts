import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { TIME_ZONE_COOKIE_NAME } from "~/src/integrations/use-intl/i18n.display"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import {
  CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY,
  CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX,
} from "~/src/modules/customer-activity/customer-activity.constants"

const database = { sqlite: new DatabaseSync(":memory:") }

const REVISED_AT = Date.parse("2026-10-17T12:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

interface Passage {
  readonly after: string
  readonly before: string
}

const PASSAGES: Record<Locale, readonly Passage[]> = {
  "en-US": [
    {
      after:
        "Your account also holds the data you add to it: your telephone number, saved addresses, wishlist, the time zone and the date and number format you choose, and two-factor authentication settings, as well as your order history.",
      before:
        "Your account also holds the data you add to it: your telephone number, saved addresses, wishlist and two-factor authentication settings, as well as your order history.",
    },
    {
      after:
        "- `marte_locale` – remembers the language version of the shop you chose; 1 year.\n- `marte_time_zone` – remembers your device's time zone, so that dates and times are shown in it; 1 year.",
      before: "- `marte_locale` – remembers the language version of the shop you chose; 1 year.",
    },
    {
      after:
        "- `tsr-scroll-restoration-v1_3` (sessionStorage) – how far you scrolled down the pages you visited, so that a page you go back to opens at the same place; until you close the tab.\n- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.\n- `better-auth.message` (localStorage) – a signal left when you sign out or change your account details, so that the shop's other open tabs update too.",
      before:
        "- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.",
    },
  ],
  "pl-PL": [
    {
      after:
        "W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń, wybraną strefę czasową i format dat i liczb oraz ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień.",
      before:
        "W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń i ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień.",
    },
    {
      after:
        "- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.\n- `marte_time_zone` – zapamiętuje strefę czasową Twojego urządzenia, aby pokazywać w niej daty i godziny; 1 rok.",
      before: "- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.",
    },
    {
      after:
        "- `tsr-scroll-restoration-v1_3` (sessionStorage) – pozycja przewinięcia odwiedzonych stron, aby strona, do której wracasz, otworzyła się w tym samym miejscu; do zamknięcia karty.\n- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.\n- `better-auth.message` (localStorage) – sygnał zapisywany po wylogowaniu albo zmianie danych konta, aby pozostałe otwarte karty sklepu też się zaktualizowały.",
      before:
        "- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.",
    },
  ],
}

const BROWSER_KEYS = [
  I18N.COOKIE_NAME,
  TIME_ZONE_COOKIE_NAME,
  "tsr-scroll-restoration-v1_3",
  "better-auth.message",
  CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX,
  CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY,
]

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

const writeBody = (locale: Locale, body: string): void => {
  database.sqlite
    .prepare("update content_page set bodies = json_set(bodies, ?, ?) where handle = ?")
    .run(`$."${locale}"`, body, CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
}

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  applyMigrationHistoryBefore(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)
})

afterEach(() => {
  database.sqlite.close()
})

describe("the privacy policy migration that lists every cookie", () => {
  it.each(LOCALES)("adds the missing cookie, storage keys and account preferences to the %s policy, and nothing else changes", (locale) => {
    const before = readPolicy().bodies[locale]

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)

    for (const passage of PASSAGES[locale]) {
      expect(before).toContain(passage.before)
    }
    expect(readPolicy().bodies[locale]).toBe(
      PASSAGES[locale].reduce((body, passage) => body.replace(passage.before, passage.after), before),
    )
  })

  it.each(LOCALES)("names every cookie and storage key the shop sets in the %s policy", (locale) => {
    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)

    for (const key of BROWSER_KEYS) {
      expect(readPolicy().bodies[locale]).toContain(key)
    }
  })

  it("dates the revision in both languages", () => {
    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)

    expect(readPolicy()).toMatchObject({ revisedAts: { "en-US": REVISED_AT, "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
  })

  it("leaves a language alone once the owner has rewritten it", () => {
    writeBody("pl-PL", "## Prywatność\n\nTreść właściciela.")
    const before = readPolicy()

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)

    const after = readPolicy()
    expect(after.bodies["pl-PL"]).toBe("## Prywatność\n\nTreść właściciela.")
    expect(after.revisedAts["pl-PL"]).toBe(before.revisedAts["pl-PL"])
    expect(after.revisedAts["en-US"]).toBe(REVISED_AT)
  })

  it("changes nothing when it runs again", () => {
    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)
    database.sqlite.prepare("update content_page set updated_at = 1 where handle = ?").run(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    const before = readPolicy()

    applyMigration(database.sqlite, MIGRATION.PRIVACY_POLICY_EVERY_COOKIE)

    expect(readPolicy()).toStrictEqual(before)
  })
})

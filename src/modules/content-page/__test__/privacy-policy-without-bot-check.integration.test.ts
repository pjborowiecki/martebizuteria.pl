import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"

const sqlite = new DatabaseSync(":memory:")

const REVISED_AT = Date.parse("2026-10-12T12:00:00.000Z")

const LOCALES = ["pl-PL", "en-US"] as const

type Locale = (typeof LOCALES)[number]

interface Passage {
  readonly after: string
  readonly before: string
}

const PASSAGES: Record<Locale, readonly Passage[]> = {
  "en-US": [
    {
      after: "fails or expires.",
      before:
        "fails or expires,\n- the result of the Cloudflare Turnstile check, which tells people from bots when you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number; to check that result, we send Cloudflare the check's one-time token together with your IP address.",
    },
    { after: "caching and protection against attacks.", before: "caching, protection against attacks and the Cloudflare Turnstile check." },
    {
      after: "",
      before:
        "### Cloudflare Turnstile\n\nWhen you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number, the Cloudflare Turnstile check loads in a frame from challenges.cloudflare.com. It checks signals from your browser and device to tell people from bots and gives the form a one-time token valid for 5 minutes. The data Turnstile processes is described in the [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).\n\n",
    },
  ],
  "pl-PL": [
    {
      after: "lub wygaśnie.",
      before:
        "lub wygaśnie,\n- wynik weryfikacji Cloudflare Turnstile, która odróżnia ludzi od botów przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia; aby sprawdzić ten wynik, przekazujemy Cloudflare jednorazowy token weryfikacji wraz z adresem IP.",
    },
    {
      after: "pamięć podręczna i ochrona przed atakami.",
      before: "pamięć podręczna, ochrona przed atakami i weryfikacja Cloudflare Turnstile.",
    },
    {
      after: "",
      before:
        "### Cloudflare Turnstile\n\nPrzy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia ładuje się weryfikacja Cloudflare Turnstile w ramce z domeny challenges.cloudflare.com. Sprawdza ona sygnały z przeglądarki i urządzenia, aby odróżnić ludzi od botów, i przekazuje formularzowi jednorazowy token ważny 5 minut. Dane przetwarzane przez Turnstile opisuje [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).\n\n",
    },
  ],
}

const SECURITY_LIST_END: Record<Locale, string> = {
  "en-US": "the payment fails or expires.\n\nThe legal basis is our legitimate interest",
  "pl-PL": "płatność się nie powiedzie lub wygaśnie.\n\nPodstawą jest nasz prawnie uzasadniony interes",
}

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
  applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_ACCOUNT_DELETION)
  applyMigration(sqlite, MIGRATION.WITHDRAWAL_FUNCTION_LINKS)
})

afterAll(() => {
  sqlite.close()
})

describe("the privacy policy migration without the bot check", () => {
  it.each(LOCALES)("removes the bot check from the %s policy, and nothing else changes", (locale) => {
    const before = readPolicy().bodies[locale]

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)

    for (const passage of PASSAGES[locale]) {
      expect(before).toContain(passage.before)
    }
    expect(readPolicy().bodies[locale]).toBe(
      PASSAGES[locale].reduce((body, passage) => body.replace(passage.before, passage.after), before),
    )
  })

  it.each(LOCALES)("leaves no word of the check in the %s policy and ends its list of security data with a full stop", (locale) => {
    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)

    const policy = readPolicy().bodies[locale]
    expect(policy).not.toMatch(/turnstile|challenges\.cloudflare\.com/iu)
    expect(policy).toContain(SECURITY_LIST_END[locale])
  })

  it("dates the revision in both languages", () => {
    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)

    expect(readPolicy()).toMatchObject({ revisedAts: { "en-US": REVISED_AT, "pl-PL": REVISED_AT }, updatedAt: REVISED_AT })
  })

  it("leaves a language alone once the owner has rewritten it", () => {
    writeBody("pl-PL", "## Prywatność\n\nTreść właściciela.")
    const before = readPolicy()

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)

    const after = readPolicy()
    expect(after.bodies["pl-PL"]).toBe("## Prywatność\n\nTreść właściciela.")
    expect(after.revisedAts["pl-PL"]).toBe(before.revisedAts["pl-PL"])
    expect(after.revisedAts["en-US"]).toBe(REVISED_AT)
  })

  it("changes nothing when it runs again", () => {
    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)
    sqlite.prepare("update content_page set updated_at = 1 where handle = ?").run(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    const before = readPolicy()

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_WITHOUT_BOT_CHECK)

    expect(readPolicy()).toStrictEqual(before)
  })
})

import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import type * as ReactStart from "@tanstack/react-start"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const effects = vi.hoisted(() => ({ audit: vi.fn<(handle: string) => void>(), invalidate: vi.fn<() => void>() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}), withRequest: {} }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleContentPageInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordContentPageUpdatedAudit: effects.audit }))
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactStart>()

  return {
    ...actual,
    createServerFn: () => {
      const state: { validate: ((input: unknown) => unknown) | undefined } = { validate: undefined }
      const builder = {
        handler: (handler: (options: { data: unknown }) => unknown) => async (options?: { data: unknown }) => {
          await Promise.resolve()

          return handler({ data: state.validate === undefined ? options?.data : state.validate(options?.data) })
        },
        middleware: () => builder,
        validator: (validate: (input: unknown) => unknown) => {
          state.validate = validate

          return builder
        },
      }

      return builder
    },
  }
})
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  CONTENT_PAGE_HANDLE,
  CONTENT_PAGE_MUTATION_KEYS,
  CONTENT_PAGE_QUERY_KEYS,
  CONTENT_PAGE_QUERY_STALE_MS,
} from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { getAdminContentPage, getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"
import { getAdminContentPages, getAdminContentPagesQuery } from "~/src/modules/content-page/use-cases/get-admin-content-pages"
import { getContentPage } from "~/src/modules/content-page/use-cases/get-content-page"
import { updateContentPage, updateContentPageMutation } from "~/src/modules/content-page/use-cases/update-content-page"

const SEEDED_AT = new Date("2026-09-29T12:00:00.000Z")

const TERMS_SEEDED_AT = new Date("2026-10-05T12:00:00.000Z")

const RETURNS_REVISED_AT = new Date("2026-10-05T10:00:00.000Z")

const PRIVACY_REVISED_AT = new Date("2026-10-10T10:00:00.000Z")

const both = (pl: string, en: string): ContentPage["localeMap"] => ({ "en-US": en, "pl-PL": pl })

const edit = (overrides: Partial<ContentPage["updateInput"]> = {}): ContentPage["updateInput"] => ({
  bodies: both("## Zwroty\n\nNowa treść.", "## Returns\n\nNew copy."),
  descriptions: both("Nowy opis.", "New description."),
  expectedUpdatedAt: RETURNS_REVISED_AT,
  handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
  titles: both("Zwroty", "Returns"),
  ...overrides,
})

const privacyBody = async (locale: "en-US" | "pl-PL"): Promise<string> => {
  const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale } })

  return page.body
}

const seedContentPagesBeforeReturnsRewrite = (): void => {
  sqlite.exec("drop table if exists content_page")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  applyMigration(sqlite, MIGRATION.TERMS_OF_SERVICE_PAGE)
}

const seedContentPagesBeforePrivacyRewrite = (): void => {
  seedContentPagesBeforeReturnsRewrite()
  applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)
}

beforeEach(() => {
  vi.clearAllMocks()
  seedContentPagesBeforePrivacyRewrite()
  applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)
})

afterAll(() => {
  sqlite.close()
})

describe("getContentPage", () => {
  it("serves the seeded page in the requested locale", async () => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })

    expect(page).toMatchObject({ revisedAt: RETURNS_REVISED_AT, title: "Exchanges and returns" })
    expect(page.body).toContain("## Complaints")
    expect(page.description).not.toBe("")
  })

  it("serves the Polish original to the Polish storefront", async () => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale: "pl-PL" } })

    expect(page.title).toBe("Polityka prywatności")
    expect(page.body).toContain("## Administrator danych")
  })

  it("falls back to the Polish copy where a translation is blank", async () => {
    sqlite.exec(`update content_page set titles = json_set(titles, '$."en-US"', '') where handle = 'privacy-policy'`)

    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale: "en-US" } })

    expect(page.title).toBe("Polityka prywatności")
  })

  it("answers not found for a page with no row", async () => {
    sqlite.exec("delete from content_page where handle = 'privacy-policy'")

    await expect(getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale: "pl-PL" } })).rejects.toSatisfy(isNotFound)
  })

  it("refuses a locale the storefront does not serve", async () => {
    await expect(getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale: "de-DE" } })).rejects.toThrow()
  })
})

describe("getAdminContentPages", () => {
  it("lists every page with its titles and last update", async () => {
    await expect(getAdminContentPages()).resolves.toStrictEqual([
      { handle: "exchanges-and-returns", titles: both("Wymiana i zwroty", "Exchanges and returns"), updatedAt: RETURNS_REVISED_AT },
      { handle: "privacy-policy", titles: both("Polityka prywatności", "Privacy policy"), updatedAt: PRIVACY_REVISED_AT },
      { handle: "terms-of-service", titles: both("Regulamin", "Terms of Service"), updatedAt: TERMS_SEEDED_AT },
    ])
  })
})

describe("getAdminContentPage", () => {
  it("returns every locale of the page for editing", async () => {
    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })

    expect(Object.keys(page.bodies).toSorted()).toStrictEqual(["en-US", "pl-PL"])
    expect(page.bodies["pl-PL"]).toContain("Pyciak Mariusz Firma Jubilerska\\\nul. Wąska 11")
  })
})

describe("updateContentPage", () => {
  it("saves every locale, moves the revision forward and announces the change", async () => {
    const { updatedAt } = await updateContentPage({ data: edit() })

    expect(updatedAt.getTime()).toBeGreaterThan(RETURNS_REVISED_AT.getTime())
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })
    expect(page).toMatchObject({ body: "## Returns\n\nNew copy.", description: "New description.", title: "Returns" })
    expect(page.revisedAt.getTime()).toBeGreaterThan(RETURNS_REVISED_AT.getTime())
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.audit).toHaveBeenCalledExactlyOnceWith("exchanges-and-returns")
  })

  it("trims the surrounding whitespace an editor leaves behind", async () => {
    await updateContentPage({ data: edit({ titles: both("  Zwroty  ", "Returns\n") }) })

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })

    expect(page.titles).toStrictEqual(both("Zwroty", "Returns"))
  })

  it("refuses to overwrite a revision someone else saved first", async () => {
    await updateContentPage({ data: edit() })

    const stale = edit({ titles: both("Stare", "Stale") })

    await expect(updateContentPage({ data: stale })).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT })
    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    expect(page.titles).toStrictEqual(both("Zwroty", "Returns"))
    expect(effects.audit).toHaveBeenCalledOnce()
  })

  it("dates each language by its own last visible change", async () => {
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    const englishOnly = edit({
      bodies: { ...seeded.bodies, "en-US": "## Returns\n\nNew copy." },
      descriptions: both("Inny opis.", "Another description."),
      titles: seeded.titles,
    })

    await updateContentPage({ data: englishOnly })

    const polish = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "pl-PL" } })
    const english = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })
    expect(polish.revisedAt).toStrictEqual(RETURNS_REVISED_AT)
    expect(english.revisedAt.getTime()).toBeGreaterThan(RETURNS_REVISED_AT.getTime())
  })

  it.each([
    ["an empty title", { titles: both("Zwroty", "  ") }],
    ["an empty body", { bodies: both("", "## Returns") }],
    ["a description longer than a search snippet can use", { descriptions: both("x".repeat(301), "ok") }],
    ["an image", { bodies: both("![pixel](https://tracker.example/p.gif)", "## Returns") }],
    ["a script link", { bodies: both("[Click](javascript:alert(1))", "## Returns") }],
    ["a link that leaves the site through a protocol-relative path", { bodies: both("[Form](//evil.example/form.pdf)", "## Returns") }],
  ])("rejects %s in any locale", async (_case, overrides) => {
    await expect(updateContentPage({ data: edit(overrides) })).rejects.toThrow()
    expect(effects.invalidate).not.toHaveBeenCalled()
  })
})

describe("getAdminContentPage for a page with no row", () => {
  it("answers not found so the editor shows its missing page state", async () => {
    sqlite.exec("delete from content_page where handle = 'privacy-policy'")

    await expect(getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })).rejects.toSatisfy(isNotFound)
  })
})

describe("updateContentPage for a page with no row", () => {
  it("reports a conflict and announces nothing", async () => {
    sqlite.exec("delete from content_page where handle = 'exchanges-and-returns'")

    await expect(updateContentPage({ data: edit() })).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT })
    expect(effects.invalidate).not.toHaveBeenCalled()
    expect(effects.audit).not.toHaveBeenCalled()
  })
})

describe("content page admin cache options", () => {
  it("caches each page under its own handle key", () => {
    const options = getAdminContentPageQuery(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)

    expect(options.queryKey).toStrictEqual([...CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE, CONTENT_PAGE_HANDLE.PRIVACY_POLICY])
    expect(options.staleTime).toBe(CONTENT_PAGE_QUERY_STALE_MS)
  })

  it("loads the page the editor asked for through the cache", async () => {
    const page = await new QueryClient().query(getAdminContentPageQuery(CONTENT_PAGE_HANDLE.PRIVACY_POLICY))

    expect(page.handle).toBe(CONTENT_PAGE_HANDLE.PRIVACY_POLICY)
    expect(page.titles).toStrictEqual(both("Polityka prywatności", "Privacy policy"))
  })

  it("caches the page list under the shared admin key", () => {
    const options = getAdminContentPagesQuery()

    expect(options.queryKey).toStrictEqual(CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL)
    expect(options.staleTime).toBe(CONTENT_PAGE_QUERY_STALE_MS)
  })

  it("loads every page for the list through the cache", async () => {
    const pages = await new QueryClient().query(getAdminContentPagesQuery())

    expect(pages.map((page) => page.handle)).toStrictEqual([
      CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
      CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
      CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE,
    ])
  })

  it("saves an edit through the mutation the editor runs", async () => {
    expect(updateContentPageMutation.mutationKey).toStrictEqual(CONTENT_PAGE_MUTATION_KEYS.UPDATE)

    await updateContentPageMutation.mutationFn?.(edit(), { client: new QueryClient(), meta: undefined })

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    expect(page.titles).toStrictEqual(both("Zwroty", "Returns"))
    expect(effects.audit).toHaveBeenCalledExactlyOnceWith(CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS)
  })
})

describe("the terms of service migration", () => {
  it.each([
    ["pl-PL", "Regulamin", "## § 1. Sprzedawca i kontakt"],
    ["en-US", "Terms of Service", "## § 1. Seller and contact"],
  ] as const)("publishes the %s terms in place of the placeholder", async (locale, title, firstSection) => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE, locale } })

    expect(page).toMatchObject({ revisedAt: TERMS_SEEDED_AT, title })
    expect(page.body).toContain(firstSection)
    expect(page.description).not.toBe("")
  })

  it.each(["pl-PL", "en-US"] as const)(
    "points the %s terms to the returns, privacy and form pages instead of repeating them",
    async (locale) => {
      const { body } = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE, locale } })

      for (const path of ["/exchanges-and-returns", "/privacy-policy", "/forms/formularz_zwrotu.pdf", "/forms/formularz_reklamacji.pdf"]) {
        expect(body).toContain(`](${path})`)
      }
      expect(body).not.toContain("ec.europa.eu/consumers/odr")
    },
  )

  it("seeds text the admin editor can save back unchanged", async () => {
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE } })

    await updateContentPage({
      data: {
        bodies: seeded.bodies,
        descriptions: seeded.descriptions,
        expectedUpdatedAt: seeded.updatedAt,
        handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE,
        titles: seeded.titles,
      },
    })

    const saved = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE } })
    expect(saved.bodies).toStrictEqual(seeded.bodies)
    expect(saved.revisedAts).toStrictEqual(seeded.revisedAts)
  })

  it("keeps the terms an admin has edited when the migration runs again", async () => {
    await updateContentPage({
      data: edit({
        bodies: both("## Regulamin\n\nTreść właściciela.", "## Terms\n\nThe owner's text."),
        expectedUpdatedAt: TERMS_SEEDED_AT,
        handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE,
      }),
    })

    applyMigration(sqlite, MIGRATION.TERMS_OF_SERVICE_PAGE)

    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.TERMS_OF_SERVICE, locale: "en-US" } })
    expect(page.body).toBe("## Terms\n\nThe owner's text.")
  })
})

describe("the returns and complaints migration", () => {
  it.each([
    ["pl-PL", "Wymiana i zwroty", "## Reklamacje"],
    ["en-US", "Exchanges and returns", "## Complaints"],
  ] as const)("rewrites the seeded %s returns page and dates the rewrite", async (locale, title, section) => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale } })

    expect(page).toMatchObject({ revisedAt: RETURNS_REVISED_AT, title })
    expect(page.body).toContain(section)
  })

  it.each([
    ["pl-PL", "14 dni roboczych"],
    ["pl-PL", "nie może nosić śladów użytkowania"],
    ["pl-PL", "konkretny rozmiar"],
    ["pl-PL", "Koszt wysyłki ponosi kupujący"],
    ["pl-PL", "w sposób wskazany przez Klienta"],
    ["pl-PL", "Okres gwarancji"],
    ["en-US", "14 working days"],
    ["en-US", "must show no signs of use"],
    ["en-US", "made in a specific size"],
    ["en-US", "The buyer covers the cost of shipping"],
    ["en-US", "by the method the customer indicated"],
    ["en-US", "The warranty period"],
  ] as const)("drops the %s statement %j that consumer law overrides", async (locale, statement) => {
    const { body } = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale } })

    expect(body).not.toContain(statement)
  })

  it.each([
    [
      "pl-PL",
      [
        "w ciągu 14 dni kalendarzowych",
        "uważa się, że uznaliśmy reklamację",
        "takiego samego sposobu płatności",
        "do nas i z powrotem ponosimy my",
        "naprawy albo wymiany",
        "obniżeniu ceny albo o odstąpieniu od umowy",
        "art. 38 ust. 1 pkt 3",
      ],
    ],
    [
      "en-US",
      [
        "within 14 calendar days",
        "your complaint is deemed accepted",
        "same means of payment",
        "sending the product to us and back",
        "repaired or replaced",
        "reducing the price or withdrawing from the contract",
        "Article 38(1)(3)",
      ],
    ],
  ] as const)("gives the %s statutory deadlines, refund route and remedies", async (locale, statements) => {
    const { body } = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale } })

    for (const statement of statements) {
      expect(body).toContain(statement)
    }
  })

  it.each(["pl-PL", "en-US"] as const)("links the %s page to both forms and the terms of service", async (locale) => {
    const { body } = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale } })

    for (const path of ["/forms/formularz_zwrotu.pdf", "/forms/formularz_reklamacji.pdf", "/terms-of-service"]) {
      expect(body).toContain(`](${path})`)
    }
  })

  it("tells English readers the forms are in Polish and gives the model withdrawal form in English", async () => {
    const { body } = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })

    expect(body).toContain("**The withdrawal and complaint forms linked below are in Polish.**")
    expect(body).toContain("- I/We hereby give notice that I/We withdraw from my/our contract of sale of the following goods: …")
  })

  it("rewrites text the admin editor can save back unchanged", async () => {
    const rewritten = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })

    await updateContentPage({
      data: {
        bodies: rewritten.bodies,
        descriptions: rewritten.descriptions,
        expectedUpdatedAt: rewritten.updatedAt,
        handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
        titles: rewritten.titles,
      },
    })

    const saved = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    expect(saved.bodies).toStrictEqual(rewritten.bodies)
    expect(saved.revisedAts).toStrictEqual(rewritten.revisedAts)
  })

  it("rewrites a page an admin saved without changing its text", async () => {
    seedContentPagesBeforeReturnsRewrite()
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    await updateContentPage({
      data: {
        bodies: seeded.bodies,
        descriptions: seeded.descriptions,
        expectedUpdatedAt: SEEDED_AT,
        handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
        titles: seeded.titles,
      },
    })

    applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    expect(page.bodies["pl-PL"]).toContain("## Reklamacje\n\n### Za co odpowiadamy")
    expect(page.bodies["en-US"]).toContain("## Complaints\n\n### What we are liable for")
    expect(page.updatedAt).toStrictEqual(RETURNS_REVISED_AT)
  })

  it("leaves both languages alone once an admin has edited either of them", async () => {
    seedContentPagesBeforeReturnsRewrite()
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    await updateContentPage({
      data: edit({
        bodies: { ...seeded.bodies, "en-US": "## Returns\n\nThe owner's text." },
        descriptions: seeded.descriptions,
        expectedUpdatedAt: SEEDED_AT,
        titles: seeded.titles,
      }),
    })

    applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS } })
    expect(page.bodies).toStrictEqual({ ...seeded.bodies, "en-US": "## Returns\n\nThe owner's text." })
    expect(page.revisedAts["pl-PL"]).toBe(SEEDED_AT.getTime())
  })

  it("keeps an admin's later edit when it runs again", async () => {
    await updateContentPage({ data: edit() })

    applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)

    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })
    expect(page.body).toBe("## Returns\n\nNew copy.")
  })
})

describe("the privacy policy migration", () => {
  it.each([
    ["pl-PL", "Polityka prywatności", "## Pliki cookies i inne dane zapisywane w przeglądarce"],
    ["en-US", "Privacy policy", "## Cookies and other data stored in your browser"],
  ] as const)("rewrites the seeded %s privacy policy and dates the rewrite", async (locale, title, section) => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale } })

    expect(page).toMatchObject({ revisedAt: PRIVACY_REVISED_AT, title })
    expect(page.body).toContain(section)
  })

  it("rewrites text the admin editor can save back unchanged", async () => {
    const rewritten = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })

    await updateContentPage({
      data: {
        bodies: rewritten.bodies,
        descriptions: rewritten.descriptions,
        expectedUpdatedAt: rewritten.updatedAt,
        handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
        titles: rewritten.titles,
      },
    })

    const saved = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })
    expect(saved.bodies).toStrictEqual(rewritten.bodies)
    expect(saved.revisedAts).toStrictEqual(rewritten.revisedAts)
  })

  it("rewrites a policy an admin saved without changing its text", async () => {
    seedContentPagesBeforePrivacyRewrite()
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })
    await updateContentPage({
      data: {
        bodies: seeded.bodies,
        descriptions: seeded.descriptions,
        expectedUpdatedAt: SEEDED_AT,
        handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
        titles: seeded.titles,
      },
    })

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })
    expect(page.bodies["pl-PL"]).toContain("## Odbiorcy danych")
    expect(page.bodies["en-US"]).toContain("## Recipients of data")
    expect(page.updatedAt).toStrictEqual(PRIVACY_REVISED_AT)
  })

  it("leaves both languages alone once an admin has edited either of them", async () => {
    seedContentPagesBeforePrivacyRewrite()
    const seeded = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })
    await updateContentPage({
      data: {
        bodies: { ...seeded.bodies, "pl-PL": "## Prywatność\n\nTreść właściciela." },
        descriptions: seeded.descriptions,
        expectedUpdatedAt: SEEDED_AT,
        handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
        titles: seeded.titles,
      },
    })

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)

    const page = await getAdminContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY } })
    expect(page.bodies).toStrictEqual({ ...seeded.bodies, "pl-PL": "## Prywatność\n\nTreść właściciela." })
    expect(page.revisedAts["en-US"]).toBe(SEEDED_AT.getTime())
  })

  it("keeps an admin's later edit when it runs again", async () => {
    await updateContentPage({
      data: edit({
        bodies: both("## Prywatność\n\nTreść właściciela.", "## Privacy\n\nThe owner's text."),
        expectedUpdatedAt: PRIVACY_REVISED_AT,
        handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY,
      }),
    })

    applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)

    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, locale: "en-US" } })
    expect(page.body).toBe("## Privacy\n\nThe owner's text.")
  })
})

describe("what the rewritten privacy policy says about processing", () => {
  it.each([
    ["pl-PL", "marketingu i promocji produktów jako uzasadniony interes"],
    ["pl-PL", "dostawcom usług IT, hostingu, marketingu i płatności"],
    ["pl-PL", "lokalizację połączenia"],
    ["en-US", "for the marketing and promotion of products as a legitimate interest"],
    ["en-US", "providers of IT, hosting, marketing and payment services"],
    ["en-US", "the location of the connection"],
  ] as const)("drops the %s statement %j that the code contradicts", async (locale, statement) => {
    await expect(privacyBody(locale)).resolves.not.toContain(statement)
  })

  it.each([
    [
      "pl-PL",
      [
        "umowę sprzedaży: przyjąć płatność",
        "przepisy o rachunkowości i podatkach (art. 6 ust. 1 lit. c RODO)",
        "Podstawą jest Twoja zgoda (art. 6 ust. 1 lit. a RODO)",
        "Zgodę możesz wycofać w każdej chwili",
        "zapobieganiu oszustwom (art. 6 ust. 1 lit. f RODO)",
      ],
    ],
    [
      "en-US",
      [
        "the contract of sale: to take payment",
        "accounting and tax law requires it (Article 6(1)(c) GDPR)",
        "The legal basis is your consent (Article 6(1)(a) GDPR)",
        "You can withdraw your consent at any time",
        "preventing fraud (Article 6(1)(f) GDPR)",
      ],
    ],
  ] as const)("gives the %s legal basis of each purpose, consent for the newsletter", async (locale, statements) => {
    const body = await privacyBody(locale)

    for (const statement of statements) {
      expect(body).toContain(statement)
    }
  })

  it.each([
    ["pl-PL", ["Stripe, Inc. w USA", "Resend, Inc. ma siedzibę w USA", "(UE) 2023/1795", "standardowych klauzulach umownych"]],
    ["en-US", ["Stripe, Inc. in the US", "Resend, Inc. is based in the US", "(EU) 2023/1795", "standard contractual clauses"]],
  ] as const)("names the %s recipients and the safeguards for transfers to the US", async (locale, transfers) => {
    const body = await privacyBody(locale)

    for (const recipient of [
      "Cloudflare, Inc.",
      "Stripe Payments Europe, Limited",
      "Resend, Inc.",
      "InPost sp. z o.o.",
      "Google",
      "CARTO",
    ]) {
      expect(body).toContain(`**${recipient}**`)
    }
    for (const statement of transfers) {
      expect(body).toContain(statement)
    }
    expect(body).not.toContain("GitHub")
  })

  it.each([
    [
      "pl-PL",
      [
        "– 5 lat, licząc od końca roku kalendarzowego",
        "– 30 dni od ich zakończenia",
        "– 90 dni",
        "– 12 miesięcy",
        "– 2 lata",
        "– 30 dni od rezygnacji",
      ],
    ],
    [
      "en-US",
      [
        "– 5 years from the end of the calendar year",
        "– 30 days after they end",
        "– 90 days",
        "– 12 months",
        "– 2 years",
        "– 30 days after unsubscribing",
      ],
    ],
  ] as const)("states every %s retention period", async (locale, periods) => {
    const body = await privacyBody(locale)

    for (const period of periods) {
      expect(body).toContain(period)
    }
  })

  it.each([
    [
      "pl-PL",
      [
        "żądań wysyłanych z jednego adresu w ciągu minuty",
        "skrót (SHA-256) adresu e-mail w licznikach",
        "do trzech wiadomości każdego rodzaju na godzinę; liczniki nie zawierają samego adresu e-mail",
        "adres IP, z którego rozpoczęto płatność, zapisywany przy zamówieniu, dopóki płatność jest otwarta",
        "przekazujemy Cloudflare jednorazowy token weryfikacji wraz z adresem IP",
        "liczniki adresów IP wygasają po minucie, a liczniki adresów e-mail po godzinie",
      ],
    ],
    [
      "en-US",
      [
        "requests can be sent from one address within a minute",
        "a hash (SHA-256) of the e-mail address in counters",
        "to three of each kind an hour; the counters do not contain the e-mail address itself",
        "the IP address a payment was started from, kept with the order while the payment is open",
        "we send Cloudflare the check's one-time token together with your IP address",
        "counters of IP addresses expire after a minute and counters of e-mail addresses after an hour",
      ],
    ],
  ] as const)("describes the %s bot check, the request and e-mail counters and how long they live", async (locale, statements) => {
    const body = await privacyBody(locale)

    for (const statement of statements) {
      expect(body).toContain(statement)
    }
  })
})

describe("what the rewritten privacy policy says about the browser and your rights", () => {
  it.each(["pl-PL", "en-US"] as const)("names every cookie and browser storage key the site sets in %s", async (locale) => {
    const body = await privacyBody(locale)

    for (const key of [
      "marte_locale",
      "__Secure-better-auth.session_token",
      "__Secure-better-auth.session_token_multi-…",
      "__Secure-better-auth.state",
      "__Secure-better-auth.two_factor",
      "__Secure-better-auth.trust_device",
      "sidebar_state",
      "marte-cart",
      "marte-checkout-session",
      "marte-checkout-draft",
      "customer-activity:page-view:…",
      "customer-activity:cart-abandoned-sent",
      "marte:datagrid:v1:…",
      "admin-sheet-width:…",
      "__stripe_mid",
      "__stripe_sid",
    ]) {
      expect(body).toContain(`\`${key}\``)
    }
  })

  it.each([
    [
      "pl-PL",
      [
        "(art. 15 RODO)",
        "(art. 16 RODO)",
        "(art. 17 RODO)",
        "(art. 18 RODO)",
        "(art. 20 RODO)",
        "(art. 21 RODO)",
        "(art. 7 ust. 3 RODO)",
        "Prezesa Urzędu Ochrony Danych Osobowych",
      ],
    ],
    [
      "en-US",
      [
        "(Article 15 GDPR)",
        "(Article 16 GDPR)",
        "(Article 17 GDPR)",
        "(Article 18 GDPR)",
        "(Article 20 GDPR)",
        "(Article 21 GDPR)",
        "(Article 7(3) GDPR)",
        "Personal Data Protection Office",
      ],
    ],
  ] as const)("lists the %s data subject rights and the complaint to the UODO", async (locale, rights) => {
    const body = await privacyBody(locale)

    for (const right of rights) {
      expect(body).toContain(right)
    }
  })

  it.each(["pl-PL", "en-US"] as const)("links the %s policy to the terms, the UODO and the providers' policies", async (locale) => {
    const body = await privacyBody(locale)

    for (const href of [
      "/terms-of-service",
      "https://uodo.gov.pl",
      "https://stripe.com/privacy",
      "https://www.cloudflare.com/turnstile-privacy-policy/",
      "https://www.dataprivacyframework.gov",
    ]) {
      expect(body).toContain(`](${href})`)
    }
  })
})

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
import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { getAdminContentPage } from "~/src/modules/content-page/use-cases/get-admin-content-page"
import { getAdminContentPages } from "~/src/modules/content-page/use-cases/get-admin-content-pages"
import { getContentPage } from "~/src/modules/content-page/use-cases/get-content-page"
import { updateContentPage } from "~/src/modules/content-page/use-cases/update-content-page"

const SEEDED_AT = new Date("2026-09-29T12:00:00.000Z")

const both = (pl: string, en: string): ContentPage["localeMap"] => ({ "en-US": en, "pl-PL": pl })

const edit = (overrides: Partial<ContentPage["updateInput"]> = {}): ContentPage["updateInput"] => ({
  bodies: both("## Zwroty\n\nNowa treść.", "## Returns\n\nNew copy."),
  descriptions: both("Nowy opis.", "New description."),
  expectedUpdatedAt: SEEDED_AT,
  handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS,
  titles: both("Zwroty", "Returns"),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("drop table if exists content_page")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
})

afterAll(() => {
  sqlite.close()
})

describe("getContentPage", () => {
  it("serves the seeded page in the requested locale", async () => {
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })

    expect(page).toMatchObject({ revisedAt: SEEDED_AT, title: "Exchanges and returns" })
    expect(page.body).toContain("## Returning goods")
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
      { handle: "exchanges-and-returns", titles: both("Wymiana i zwroty", "Exchanges and returns"), updatedAt: SEEDED_AT },
      { handle: "privacy-policy", titles: both("Polityka prywatności", "Privacy policy"), updatedAt: SEEDED_AT },
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

    expect(updatedAt.getTime()).toBeGreaterThan(SEEDED_AT.getTime())
    const page = await getContentPage({ data: { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, locale: "en-US" } })
    expect(page).toMatchObject({ body: "## Returns\n\nNew copy.", description: "New description.", title: "Returns" })
    expect(page.revisedAt.getTime()).toBeGreaterThan(SEEDED_AT.getTime())
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
    expect(polish.revisedAt).toStrictEqual(SEEDED_AT)
    expect(english.revisedAt.getTime()).toBeGreaterThan(SEEDED_AT.getTime())
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

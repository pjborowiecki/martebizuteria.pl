import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { saveSellerDetailsIfUnchanged } from "~/src/modules/store-setting/store-setting.accessors"
import { updateSellerDetails } from "~/src/modules/store-setting/use-cases/update-seller-details"

const { effects, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    effects: {
      contentPagesInvalidate: vi.fn<() => void>(),
      requestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
    },
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/en-US/admin/settings/store") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: effects.requestSession }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleContentPageInvalidation: effects.contentPagesInvalidate,
  scheduleSellerDetailsInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordSettingsUpdatedAudit: vi.fn() }))

const SEEDED_AT = Date.UTC(2026, 9, 1, 12)

const SELLER_UPDATED_AT = new Date(Date.UTC(2026, 9, 16, 12))

const SELLER = {
  city: "Bochnia",
  countryCode: "PL",
  email: "kontakt@martebizuteria.pl",
  legalName: "Pyciak Mariusz Firma Jubilerska",
  nip: "8681772646",
  phone: "+48 663 150 820",
  postalCode: "32-700",
  regon: "384616568",
  street: "ul. Wąska 11",
} as const

const pageRowsSchema = z.array(z.object({ handle: z.string(), revised_ats: z.string(), updated_at: z.number() }))

const revisedLocales = (): Record<string, string[]> =>
  Object.fromEntries(
    pageRowsSchema
      .parse(sqlite.prepare("select handle, revised_ats, updated_at from content_page order by handle").all())
      .map(({ handle, revised_ats: revisedAts }) => [
        handle,
        Object.entries(z.record(z.string(), z.number()).parse(JSON.parse(revisedAts)))
          .filter(([, revisedAt]) => revisedAt !== SEEDED_AT)
          .map(([locale]) => locale)
          .toSorted(),
      ]),
  )

const UNREVISED = { "exchanges-and-returns": [], faq: [], "privacy-policy": [], "terms-of-service": [] }

beforeEach(() => {
  vi.clearAllMocks()
  effects.requestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  sqlite.exec("drop table if exists store_setting")
  sqlite.exec("drop table if exists content_page")
  for (const migration of [
    MIGRATION.STORE_SETTINGS,
    MIGRATION.FREE_DELIVERY_THRESHOLD,
    MIGRATION.SELLER_DETAILS,
    MIGRATION.CONTENT_PAGES,
    MIGRATION.TERMS_OF_SERVICE_PAGE,
    MIGRATION.RETURNS_AND_COMPLAINTS_PAGE,
    MIGRATION.PRIVACY_POLICY_PAGE,
    MIGRATION.FAQ_PAGE,
    MIGRATION.SELLER_PLACEHOLDERS,
  ]) {
    applyMigration(sqlite, migration)
  }
  sqlite.exec(`update store_setting set seller_updated_at = ${String(SELLER_UPDATED_AT.getTime())}`)
  sqlite.exec(
    `update content_page set revised_ats = json_object('pl-PL', ${String(SEEDED_AT)}, 'en-US', ${String(SEEDED_AT)}), updated_at = ${String(SEEDED_AT)}`,
  )
})

afterAll(() => {
  sqlite.close()
})

describe("saveSellerDetailsIfUnchanged", () => {
  it("dates the legal pages it is handed in the same batch as the save", async () => {
    await saveSellerDetailsIfUnchanged({
      details: { ...SELLER, phone: "+48 600 700 800" },
      expectedUpdatedAt: SELLER_UPDATED_AT,
      revisedPages: [{ handle: "faq", locales: ["en-US", "pl-PL"] }],
    })

    expect(revisedLocales()).toStrictEqual({ ...UNREVISED, faq: ["en-US", "pl-PL"] })
  })

  it("leaves every page's date alone when the save is refused because someone saved the details first", async () => {
    await expect(
      saveSellerDetailsIfUnchanged({
        details: { ...SELLER, phone: "+48 600 700 800" },
        expectedUpdatedAt: new Date(0),
        revisedPages: [{ handle: "faq", locales: ["en-US", "pl-PL"] }],
      }),
    ).resolves.toBeUndefined()

    expect(revisedLocales()).toStrictEqual(UNREVISED)
  })
})

describe("updateSellerDetails and the legal pages' last updated date", () => {
  it("dates only the pages and languages that show a changed detail, and refreshes their open tabs", async () => {
    await updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: SELLER_UPDATED_AT, street: "ul. Floriańska 1" } })

    expect(revisedLocales()).toStrictEqual({
      ...UNREVISED,
      "exchanges-and-returns": ["en-US", "pl-PL"],
      "privacy-policy": ["en-US", "pl-PL"],
      "terms-of-service": ["en-US", "pl-PL"],
    })
    expect(effects.contentPagesInvalidate).toHaveBeenCalledOnce()
  })

  it("dates the pages that show the phone, through their phone links, when only the phone changes", async () => {
    await updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: SELLER_UPDATED_AT, phone: "+48 600 700 800" } })

    expect(revisedLocales()).toStrictEqual({
      ...UNREVISED,
      faq: ["en-US", "pl-PL"],
      "privacy-policy": ["en-US", "pl-PL"],
      "terms-of-service": ["en-US", "pl-PL"],
    })
  })

  it("dates only the English pages, which write the country out, when only the country changes", async () => {
    await updateSellerDetails({ data: { ...SELLER, countryCode: "DE", expectedUpdatedAt: SELLER_UPDATED_AT } })

    expect(revisedLocales()).toStrictEqual({
      ...UNREVISED,
      "exchanges-and-returns": ["en-US"],
      "privacy-policy": ["en-US"],
      "terms-of-service": ["en-US"],
    })
  })

  it("dates nothing and refreshes no page when no page shows the changed detail", async () => {
    sqlite.exec("update content_page set bodies = json_object('pl-PL', 'Brak danych.', 'en-US', 'No details.')")

    await updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: SELLER_UPDATED_AT, regon: "100000050" } })

    expect(revisedLocales()).toStrictEqual(UNREVISED)
    expect(effects.contentPagesInvalidate).not.toHaveBeenCalled()
  })

  it("dates nothing when another admin saved the details first", async () => {
    await expect(
      updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: new Date(0), street: "ul. Floriańska 1" } }),
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT })

    expect(revisedLocales()).toStrictEqual(UNREVISED)
    expect(effects.contentPagesInvalidate).not.toHaveBeenCalled()
  })
})

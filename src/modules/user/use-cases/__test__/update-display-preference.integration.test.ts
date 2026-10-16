import { QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ context: { auth: { user: { id: "user-anna" } } }, data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { updateDisplayPreference, updateDisplayPreferenceMutation } from "~/src/modules/user/use-cases/update-display-preference"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

const readPreferences = (id: string) =>
  z
    .object({ format_locale: z.string().nullable(), timezone: z.string().nullable() })
    .parse(sqlite.prepare("select format_locale, timezone from user where id = ?").get(id))

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec(`
    delete from user;
    insert into user (id, name, email, timezone, format_locale) values
      ('user-anna', 'Anna', 'anna@example.com', 'Europe/Warsaw', 'pl-PL'),
      ('user-jan', 'Jan', 'jan@example.com', 'Europe/Warsaw', 'pl-PL');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("updateDisplayPreference", () => {
  it("saves the format locale the signed-in user chose, and only theirs", async () => {
    await expect(updateDisplayPreference({ data: { preference: "formatLocale", value: "en-GB" } })).resolves.toBe(true)

    expect(readPreferences("user-anna")).toStrictEqual({ format_locale: "en-GB", timezone: "Europe/Warsaw" })
    expect(readPreferences("user-jan")).toStrictEqual({ format_locale: "pl-PL", timezone: "Europe/Warsaw" })
  })

  it("saves the time zone the signed-in user chose", async () => {
    await updateDisplayPreference({ data: { preference: "timeZone", value: "America/New_York" } })

    expect(readPreferences("user-anna")).toStrictEqual({ format_locale: "pl-PL", timezone: "America/New_York" })
  })

  it.each(["formatLocale", "timeZone"] as const)(
    "clears %s so it follows the browser again when the user picks automatic",
    async (preference) => {
      await updateDisplayPreference({ data: { preference, value: "" } })

      expect(readPreferences("user-anna")[preference === "formatLocale" ? "format_locale" : "timezone"]).toBeNull()
    },
  )

  it.each([
    { preference: "formatLocale", value: "not a locale" },
    { preference: "formatLocale", value: "de-de" },
    { preference: "timeZone", value: "Mars/Olympus_Mons" },
  ] as const)("refuses $preference = $value and saves nothing", async (data) => {
    await expect(updateDisplayPreference({ data })).rejects.toThrow()

    expect(readPreferences("user-anna")).toStrictEqual({ format_locale: "pl-PL", timezone: "Europe/Warsaw" })
  })

  it("is keyed as a user mutation and sends the choice through the server function", async () => {
    expect(updateDisplayPreferenceMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.UPDATE_DISPLAY_PREFERENCE)

    await updateDisplayPreferenceMutation.mutationFn?.(
      { preference: "timeZone", value: "Asia/Tokyo" },
      { client: new QueryClient(), meta: undefined },
    )

    expect(readPreferences("user-anna").timezone).toBe("Asia/Tokyo")
  })
})

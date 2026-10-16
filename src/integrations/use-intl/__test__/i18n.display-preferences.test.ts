import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const server = vi.hoisted(() => ({
  edgeTimeZone: undefined as string | undefined,
  request: new Request("https://store.test/"),
  user: undefined as { formatLocale?: string | null; timezone?: string | null } | undefined,
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (handler: unknown) => handler }),
  getGlobalStartContext: () => ({ edgeTimeZone: server.edgeTimeZone }),
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => server.request }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve(server.user === undefined ? null : { user: server.user }),
}))

import { DISPLAY_PREFERENCES_QUERY_KEY } from "~/src/integrations/use-intl/i18n.display"
import { displayPreferencesQuery, getDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

beforeEach(() => {
  server.edgeTimeZone = undefined
  server.request = new Request("https://store.test/")
  server.user = undefined
})

describe("getDisplayPreferences", () => {
  it("detects a visitor's formats from their browser's languages and their time zone from the edge", async () => {
    server.request = new Request("https://store.test/", { headers: { "accept-language": "pl-PL,pl;q=0.9" } })
    server.edgeTimeZone = "Europe/Warsaw"

    await expect(getDisplayPreferences()).resolves.toStrictEqual({
      detected: { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" },
      saved: { formatLocale: undefined, timeZone: undefined },
    })
  })

  it("reads the time zone the browser reported in its cookie and what the signed-in user saved", async () => {
    server.request = new Request("https://store.test/", { headers: { cookie: "marte_time_zone=Asia%2FTokyo" } })
    server.edgeTimeZone = "Europe/Warsaw"
    server.user = { formatLocale: "en-GB", timezone: "America/New_York" }

    await expect(getDisplayPreferences()).resolves.toStrictEqual({
      detected: { formatLocale: "en-US", timeZone: "Asia/Tokyo" },
      saved: { formatLocale: "en-GB", timeZone: "America/New_York" },
    })
  })
})

describe("displayPreferencesQuery", () => {
  it("is cached for good under its own key and fetched through the server function", async () => {
    const queryClient = new QueryClient()

    await expect(queryClient.query(displayPreferencesQuery)).resolves.toStrictEqual({
      detected: { formatLocale: "en-US", timeZone: "UTC" },
      saved: { formatLocale: undefined, timeZone: undefined },
    })
    expect(displayPreferencesQuery.queryKey).toStrictEqual(DISPLAY_PREFERENCES_QUERY_KEY)
    expect(displayPreferencesQuery.staleTime).toBe(Number.POSITIVE_INFINITY)
  })
})

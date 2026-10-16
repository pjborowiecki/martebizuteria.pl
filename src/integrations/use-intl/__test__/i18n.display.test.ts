import { describe, expect, it } from "vite-plus/test"

import {
  FALLBACK_FORMAT_LOCALE,
  FALLBACK_TIME_ZONE,
  detectDisplayPreferences,
  formatLocaleFromAcceptLanguage,
  isTimeZone,
  readBrowserTimeZone,
  resolveDisplayPreferences,
  toFormatLocale,
  toSavedDisplayPreferences,
} from "~/src/integrations/use-intl/i18n.display"

const NO_SIGNALS = { acceptLanguage: undefined, cookieHeader: undefined, edgeTimeZone: undefined }

describe("isTimeZone", () => {
  it.each(["Europe/Warsaw", "America/Indiana/Indianapolis", "UTC"])("accepts the time zone %s", (zone) => {
    expect(isTimeZone(zone)).toBe(true)
  })

  it.each([undefined, null, "", "Mars/Olympus_Mons", `Europe/${"x".repeat(64)}`])("refuses %j", (zone) => {
    expect(isTimeZone(zone)).toBe(false)
  })
})

describe("toFormatLocale", () => {
  it("canonicalizes the case of a tag the runtime can format with", () => {
    expect(toFormatLocale("de-de")).toBe("de-DE")
  })

  it("refuses a well-formed tag the runtime has no formats for", () => {
    expect(toFormatLocale("qaa")).toBeUndefined()
  })

  it("accepts a language without a region", () => {
    expect(toFormatLocale("pl")).toBe("pl")
  })

  it.each([undefined, null, "", "not a locale", "x".repeat(36)])("refuses %j", (value) => {
    expect(toFormatLocale(value)).toBeUndefined()
  })
})

describe("formatLocaleFromAcceptLanguage", () => {
  it("takes the browser's first language", () => {
    expect(formatLocaleFromAcceptLanguage("pl-PL,pl;q=0.9,en-US;q=0.8")).toBe("pl-PL")
  })

  it("skips entries that are not locales", () => {
    expect(formatLocaleFromAcceptLanguage("*;q=0.5, en-GB;q=0.4")).toBe("en-GB")
  })

  it.each([undefined, null, "", "*"])("finds nothing in %j", (header) => {
    expect(formatLocaleFromAcceptLanguage(header)).toBeUndefined()
  })
})

describe("detectDisplayPreferences", () => {
  it("falls back to English formats and UTC when the request says nothing", () => {
    expect(detectDisplayPreferences(NO_SIGNALS)).toStrictEqual({ formatLocale: FALLBACK_FORMAT_LOCALE, timeZone: FALLBACK_TIME_ZONE })
  })

  it("prefers the time zone the browser stored in its cookie over the edge's guess", () => {
    const detected = detectDisplayPreferences({
      acceptLanguage: "fr-FR",
      cookieHeader: "marte_locale=pl-PL; marte_time_zone=Asia%2FTokyo",
      edgeTimeZone: "Europe/Warsaw",
    })

    expect(detected).toStrictEqual({ formatLocale: "fr-FR", timeZone: "Asia/Tokyo" })
  })

  it("uses the edge's time zone when the cookie is missing or holds no time zone", () => {
    expect(
      detectDisplayPreferences({ ...NO_SIGNALS, cookieHeader: "marte_time_zone=Nowhere", edgeTimeZone: "Europe/Warsaw" }).timeZone,
    ).toBe("Europe/Warsaw")
  })
})

describe("toSavedDisplayPreferences", () => {
  it("keeps what a user saved", () => {
    expect(toSavedDisplayPreferences({ formatLocale: "en-GB", timezone: "America/New_York" })).toStrictEqual({
      formatLocale: "en-GB",
      timeZone: "America/New_York",
    })
  })

  it("treats a visitor, empty values and values the runtime cannot use as not saved", () => {
    const empty = { formatLocale: undefined, timeZone: undefined }

    expect(toSavedDisplayPreferences(undefined)).toStrictEqual(empty)
    expect(toSavedDisplayPreferences({ formatLocale: null, timezone: null })).toStrictEqual(empty)
    expect(toSavedDisplayPreferences({ formatLocale: "??", timezone: "Nowhere" })).toStrictEqual(empty)
  })
})

describe("resolveDisplayPreferences", () => {
  const detected = { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" }

  it("lets each saved preference win over the detected one", () => {
    expect(resolveDisplayPreferences({ detected, saved: { formatLocale: "en-GB", timeZone: undefined } })).toStrictEqual({
      formatLocale: "en-GB",
      timeZone: "Europe/Warsaw",
    })
    expect(resolveDisplayPreferences({ detected, saved: { formatLocale: undefined, timeZone: "UTC" } })).toStrictEqual({
      formatLocale: "pl-PL",
      timeZone: "UTC",
    })
  })
})

describe("readBrowserTimeZone", () => {
  it("reads the runtime's own time zone", () => {
    expect(readBrowserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
})

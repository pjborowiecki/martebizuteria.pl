import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { isContentPageHandle, reviseChangedLocales, revisionDateFor } from "~/src/modules/content-page/content-page.utils"

const SEEDED_AT = Date.UTC(2026, 8, 29, 12)

const POLISH_REVISED_AT = Date.UTC(2026, 8, 1)

const NOW = new Date("2026-10-03T08:00:00.000Z")

const both = (pl: string, en: string): ContentPage["localeMap"] => ({ "en-US": en, "pl-PL": pl })

const stored = {
  bodies: both("## Zwroty", "## Returns"),
  revisedAts: { "en-US": SEEDED_AT, "pl-PL": POLISH_REVISED_AT },
  titles: both("Zwroty", "Returns"),
}

describe("isContentPageHandle", () => {
  it.each([[CONTENT_PAGE_HANDLE.PRIVACY_POLICY], [CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS]])("accepts the page handle %s", (handle) => {
    expect(isContentPageHandle(handle)).toBe(true)
  })

  it.each([["terms-of-service"], [""], ["Privacy-Policy"]])("refuses %j, which no editable page uses", (handle) => {
    expect(isContentPageHandle(handle)).toBe(false)
  })
})

describe("reviseChangedLocales", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps every revision date when nothing a reader sees has changed", () => {
    expect(reviseChangedLocales(stored, { bodies: stored.bodies, titles: stored.titles })).toStrictEqual(stored.revisedAts)
  })

  it("moves only the locale whose body changed to now", () => {
    expect(reviseChangedLocales(stored, { bodies: both("## Zwroty", "## Returns\n\nNew copy."), titles: stored.titles })).toStrictEqual({
      "en-US": NOW.getTime(),
      "pl-PL": POLISH_REVISED_AT,
    })
  })

  it("treats a retitled locale as revised even when its body is untouched", () => {
    expect(reviseChangedLocales(stored, { bodies: stored.bodies, titles: both("Wymiana i zwroty", "Returns") })).toStrictEqual({
      "en-US": SEEDED_AT,
      "pl-PL": NOW.getTime(),
    })
  })
})

describe("revisionDateFor", () => {
  it("dates a page by the revision of the locale being read", () => {
    expect(revisionDateFor(stored.revisedAts, "en-US")).toStrictEqual(new Date(SEEDED_AT))
  })

  it("falls back to the Polish revision for a locale the storefront does not serve", () => {
    expect(revisionDateFor(stored.revisedAts, "de-DE")).toStrictEqual(new Date(POLISH_REVISED_AT))
  })
})

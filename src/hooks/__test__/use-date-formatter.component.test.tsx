import { type ReactNode } from "react"

import { cleanup, renderHook } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { type DateOptions, useDateFormatter } from "~/src/hooks/use-date-formatter"

const PI_DAY = new Date("2026-03-14T12:00:00.000Z")

const RouteLocale = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES}>
    {children}
  </IntlProvider>
)

const formatterFor = (defaults?: Partial<DateOptions>) =>
  renderHook(() => useDateFormatter(defaults), { wrapper: RouteLocale }).result.current

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("useDateFormatter", () => {
  it("formats in the locale of the route when nothing overrides it", () => {
    const { formatDate } = formatterFor({ dateStyle: "long", timeZone: "UTC" })

    expect(formatDate({ value: PI_DAY })).toBe("March 14, 2026")
  })

  it("prefers the locale the hook was given over the route locale", () => {
    const { formatDate } = formatterFor({ dateStyle: "long", locale: "pl-PL", timeZone: "UTC" })

    expect(formatDate({ value: PI_DAY })).toBe("14 marca 2026")
  })

  it("lets a single call choose its own locale", () => {
    const { formatDate } = formatterFor({ dateStyle: "long", locale: "pl-PL", timeZone: "UTC" })

    expect(formatDate({ locale: "en-US", value: PI_DAY })).toBe("March 14, 2026")
  })

  it("applies the options of a call over the hook defaults", () => {
    const { formatDate } = formatterFor({ month: "long", timeZone: "UTC", year: "numeric" })

    expect(formatDate({ month: "short", value: PI_DAY })).toBe("Mar 2026")
  })

  it("reads a timestamp and an ISO string the same way as a Date", () => {
    const { formatDate } = formatterFor()
    const options = { dateStyle: "long", timeZone: "UTC" } as const

    expect(formatDate({ ...options, value: PI_DAY.getTime() })).toBe("March 14, 2026")
    expect(formatDate({ ...options, value: PI_DAY.toISOString() })).toBe("March 14, 2026")
  })

  it("splits a date into labelled parts", () => {
    const { formatDateToParts } = formatterFor({ timeZone: "UTC" })

    const parts = formatDateToParts({ day: "numeric", month: "long", value: PI_DAY })

    expect(parts.find((part) => part.type === "month")?.value).toBe("March")
    expect(parts.find((part) => part.type === "day")?.value).toBe("14")
  })

  it("builds one formatter per locale and option set, whatever order the options arrive in", () => {
    const constructed = vi.spyOn(Intl, "DateTimeFormat")

    const fromDefaults = formatterFor({ timeZone: "Asia/Tokyo", year: "numeric" }).formatDate({ month: "long", value: PI_DAY })
    const fromCall = formatterFor({ month: "long" }).formatDate({ timeZone: "Asia/Tokyo", value: PI_DAY, year: "numeric" })

    expect(fromDefaults).toBe("March 2026")
    expect(fromCall).toBe(fromDefaults)
    expect(constructed.mock.calls.filter(([, options]) => options?.timeZone === "Asia/Tokyo")).toHaveLength(1)
  })
})

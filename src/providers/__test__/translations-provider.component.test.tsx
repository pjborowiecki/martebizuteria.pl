import { type JSX, type ReactNode, Suspense } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useFormatter, useTranslations } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface RouteMatch {
  staticData: { namespaces?: readonly string[] }
}

const routerState = vi.hoisted(() => ({
  locale: "en-US",
  matches: [] as RouteMatch[],
}))

const display = vi.hoisted(() => ({
  browserTimeZone: "Europe/Warsaw",
  state: {
    detected: { formatLocale: "en-US", timeZone: "Europe/Warsaw" },
    saved: { formatLocale: undefined as string | undefined, timeZone: undefined as string | undefined },
  },
}))

vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  displayPreferencesQuery: {
    queryFn: () => Promise.resolve(display.state),
    queryKey: ["i18n", "displayPreferences"],
    staleTime: Number.POSITIVE_INFINITY,
  },
}))
vi.mock(import("~/src/integrations/use-intl/i18n.display"), async (importOriginal) => ({
  ...(await importOriginal()),
  readBrowserTimeZone: () => display.browserTimeZone,
}))
vi.mock("@tanstack/react-router", () => ({
  useMatches: ({ select }: { select: (matches: readonly RouteMatch[]) => string[] }) => select(routerState.matches),
  useRouterState: ({ select }: { select: () => string }) => select(),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => routerState.locale }))

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { useFormatter as useDisplayFormatter } from "~/src/hooks/use-display-format"

const Probe = ({ namespace, messageKey }: Readonly<{ messageKey: string; namespace: string }>): JSX.Element => {
  const t = useTranslations(namespace)

  return <p data-testid="probe">{t(messageKey)}</p>
}

const ClockProbe = (): JSX.Element => {
  const format = useFormatter()

  return <p data-testid="clock">{format.dateTime(new Date("2026-06-15T23:30:00.000Z"), { hour: "2-digit", minute: "2-digit" })}</p>
}

const FormatProbe = (): JSX.Element => {
  const format = useDisplayFormatter()

  return <p data-testid="format">{format.number(1234.5)}</p>
}

const renderProvider = (children: ReactNode, locale?: "en-US" | "pl-PL"): void => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>loading</p>}>
        <TranslationsProvider {...(locale === undefined ? {} : { locale })}>{children}</TranslationsProvider>
      </Suspense>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  routerState.locale = "en-US"
  routerState.matches = []
  display.browserTimeZone = "Europe/Warsaw"
  display.state = {
    detected: { formatLocale: "en-US", timeZone: "Europe/Warsaw" },
    saved: { formatLocale: undefined, timeZone: undefined },
  }
  document.cookie = "marte_time_zone=; Max-Age=0; Path=/"
  document.cookie = `${I18N.COOKIE_NAME}=; Max-Age=0; Path=/`
})

afterEach(() => {
  cleanup()
})

describe("TranslationsProvider messages", () => {
  it("always loads the root namespaces", async () => {
    renderProvider(<Probe messageKey="yes" namespace="common" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("Yes")
  })

  it("loads the namespaces the matched routes declare", async () => {
    routerState.matches = [{ staticData: { namespaces: ["pages.cart"] } }]
    renderProvider(<Probe messageKey="title" namespace="pages.cart" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("Cart")
  })

  it("nests a dotted namespace into the message tree", async () => {
    renderProvider(<Probe messageKey="UNAUTHORIZED" namespace="errors.action" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("You must be signed in to continue.")
  })

  it("ignores a match that declares no namespaces", async () => {
    routerState.matches = [{ staticData: {} }, { staticData: { namespaces: ["pages.cart"] } }]
    renderProvider(<Probe messageKey="title" namespace="pages.cart" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("Cart")
  })

  it("loads a namespace only once when two matches declare it", async () => {
    routerState.matches = [{ staticData: { namespaces: ["pages.cart"] } }, { staticData: { namespaces: ["pages.cart"] } }]
    renderProvider(<Probe messageKey="emptyTitle" namespace="pages.cart" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("Your cart is empty")
  })
})

describe("TranslationsProvider locale", () => {
  it("serves the catalogue of the locale the router is on", async () => {
    routerState.locale = "pl-PL"
    renderProvider(<Probe messageKey="yes" namespace="common" />)

    expect(await screen.findByTestId("probe")).toHaveTextContent("Tak")
  })

  it("lets an explicit locale prop win over the router", async () => {
    routerState.locale = "pl-PL"
    renderProvider(<Probe messageKey="yes" namespace="common" />, "en-US")

    expect(await screen.findByTestId("probe")).toHaveTextContent("Yes")
  })

  it("remembers the active locale in the shared cookie", async () => {
    routerState.locale = "pl-PL"
    renderProvider(<Probe messageKey="yes" namespace="common" />)
    await screen.findByTestId("probe")

    expect(document.cookie).toContain(`${I18N.COOKIE_NAME}=pl-PL`)
  })

  it("only marks the locale cookie Secure on a page served over HTTPS", async () => {
    const written: string[] = []
    vi.spyOn(Document.prototype, "cookie", "set").mockImplementation((value: string) => {
      written.push(value)
    })
    vi.stubGlobal("location", { pathname: "/en-US", protocol: "https:" })
    renderProvider(<Probe messageKey="yes" namespace="common" />)
    await screen.findByTestId("probe")

    const localeCookie = written.find((cookie) => cookie.startsWith(`${I18N.COOKIE_NAME}=`))
    expect(localeCookie).toContain(`${I18N.COOKIE_NAME}=en-US`)
    expect(localeCookie).toContain("Secure")
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

describe("TranslationsProvider display preferences", () => {
  it("formats times in the time zone detected for the visitor", async () => {
    renderProvider(<ClockProbe />)

    expect(await screen.findByTestId("clock")).toHaveTextContent("01:30")
  })

  it("formats times in the time zone the user saved over the detected one", async () => {
    display.state = { ...display.state, saved: { formatLocale: undefined, timeZone: "America/New_York" } }
    renderProvider(<ClockProbe />)

    expect(await screen.findByTestId("clock")).toHaveTextContent("07:30 PM")
  })

  it("moves to the browser's own time zone when the request only guessed one, and remembers it for the next request", async () => {
    display.browserTimeZone = "Asia/Tokyo"
    display.state = { ...display.state, detected: { formatLocale: "en-US", timeZone: "UTC" } }
    renderProvider(<ClockProbe />)

    await waitFor(() => {
      expect(screen.getByTestId("clock")).toHaveTextContent("08:30 AM")
    })
    expect(document.cookie).toContain("marte_time_zone=Asia%2FTokyo")
  })

  it("keeps a saved time zone when the browser is somewhere else", async () => {
    display.browserTimeZone = "Asia/Tokyo"
    display.state = { ...display.state, saved: { formatLocale: undefined, timeZone: "America/New_York" } }
    renderProvider(<ClockProbe />)

    await waitFor(() => {
      expect(document.cookie).toContain("marte_time_zone=Asia%2FTokyo")
    })
    expect(screen.getByTestId("clock")).toHaveTextContent("07:30 PM")
  })

  it("ignores a browser that reports no usable time zone", async () => {
    display.browserTimeZone = ""
    renderProvider(<ClockProbe />)

    expect(await screen.findByTestId("clock")).toHaveTextContent("01:30")
    expect(document.cookie).not.toContain("marte_time_zone=")
  })

  it("formats numbers in the format locale the user chose, whatever the language", async () => {
    display.state = { ...display.state, saved: { formatLocale: "de-DE", timeZone: undefined } }
    renderProvider(<FormatProbe />)

    expect(await screen.findByTestId("format")).toHaveTextContent("1.234,5")
  })

  it("formats numbers in the detected format locale when the user chose none", async () => {
    display.state = { ...display.state, detected: { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" } }
    renderProvider(<FormatProbe />)

    expect(await screen.findByTestId("format")).toHaveTextContent("1234,5")
  })
})

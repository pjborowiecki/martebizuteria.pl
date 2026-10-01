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

const session = vi.hoisted(() => ({ current: undefined as { user: { timezone?: string | null } } | undefined }))

vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSession: () => Promise.resolve(session.current),
  getCurrentSessionQuery: { queryFn: () => Promise.resolve(session.current), queryKey: ["session", "current"] },
}))
vi.mock("@tanstack/react-router", () => ({
  useMatches: ({ select }: { select: (matches: readonly RouteMatch[]) => string[] }) => select(routerState.matches),
  useRouterState: ({ select }: { select: () => string }) => select(),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => routerState.locale }))

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

const Probe = ({ namespace, messageKey }: Readonly<{ messageKey: string; namespace: string }>): JSX.Element => {
  const t = useTranslations(namespace)

  return <p data-testid="probe">{t(messageKey)}</p>
}

const ClockProbe = (): JSX.Element => {
  const format = useFormatter()

  return <p data-testid="clock">{format.dateTime(new Date("2026-06-15T23:30:00.000Z"), { hour: "2-digit", minute: "2-digit" })}</p>
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
  session.current = undefined
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

  it("formats times in the store timezone rather than the browser one", async () => {
    renderProvider(<ClockProbe />)

    expect(await screen.findByTestId("clock")).toHaveTextContent("01:30")
  })

  it("formats times in the timezone the signed-in customer saved", async () => {
    session.current = { user: { timezone: "America/New_York" } }
    renderProvider(<ClockProbe />)
    await screen.findByTestId("clock")

    await waitFor(() => {
      expect(screen.getByTestId("clock")).toHaveTextContent("07:30 PM")
    })
  })

  it("keeps the store timezone for a customer who saved none", async () => {
    session.current = { user: { timezone: null } }
    renderProvider(<ClockProbe />)

    expect(await screen.findByTestId("clock")).toHaveTextContent("01:30")
  })
})

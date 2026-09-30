import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"

const snapshot = vi.hoisted(() => ({ fetch: vi.fn<(locale: string) => Promise<{ locale: string }>>() }))

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (ctx: Readonly<{ context: { locale: SupportedLocale; queryClient: QueryClient } }>) => Promise<unknown>
  readonly shouldReload?: boolean
  readonly staleTime?: number
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot", () => ({
  getDashboardSnapshotQuery: ({ locale }: Readonly<{ locale: string }>) => ({
    queryFn: () => snapshot.fetch(locale),
    queryKey: ["admin", "dashboard", "snapshot", locale],
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ description, title }: Readonly<{ description?: string; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-overview-content", () => ({
  DashboardOverviewContent: (): JSX.Element => <section data-testid="dashboard-overview" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/admin.overview")

const route = captured.current

if (route?.component === undefined || route.loader === undefined) {
  throw new Error("the admin overview route registered no component or loader")
}

const AdminOverviewPage = route.component

beforeEach(() => {
  vi.clearAllMocks()
  snapshot.fetch.mockImplementation((locale: string) => Promise.resolve({ locale }))
})

afterEach(cleanup)

describe("admin overview page", () => {
  it("heads the dashboard with its translated title and description", () => {
    renderWithProviders(<AdminOverviewPage />)

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByText("Overview of your store's performance and recent activity.")).toBeInTheDocument()
  })

  it("puts the dashboard content below the header", () => {
    renderWithProviders(<AdminOverviewPage />)

    expect(screen.getByTestId("dashboard-overview")).toBeInTheDocument()
  })
})

describe("admin overview route", () => {
  it("warms the dashboard snapshot for the admin locale before the page renders", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await route.loader?.({ context: { locale: "en-US", queryClient } })

    expect(snapshot.fetch).toHaveBeenCalledExactlyOnceWith("en-US")
    expect(queryClient.getQueryData(["admin", "dashboard", "snapshot", "en-US"])).toStrictEqual({ locale: "en-US" })
  })

  it("serves the warmed snapshot from the cache on a second visit", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await route.loader?.({ context: { locale: "en-US", queryClient } })
    await route.loader?.({ context: { locale: "en-US", queryClient } })

    expect(snapshot.fetch).toHaveBeenCalledTimes(1)
  })

  it("keeps the dashboard fresh for the shared dashboard window and never reloads on a revisit", () => {
    expect(route.staleTime).toBe(ADMIN_DASHBOARD_QUERY_STALE_MS)
    expect(route.shouldReload).toBe(false)
  })
})

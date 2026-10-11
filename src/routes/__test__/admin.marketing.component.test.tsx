import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface MarketingRouteDefinition {
  readonly component?: (() => JSX.Element) | undefined
  readonly loader?: (ctx: Readonly<{ context: { queryClient: QueryClient } }>) => Promise<void>
}

const captured = vi.hoisted(() => ({ routes: new Map<string, MarketingRouteDefinition>() }))

const remote = vi.hoisted(() => ({
  campaigns: vi.fn<() => Promise<unknown>>(),
  stats: vi.fn<() => Promise<unknown>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: (path: string) => (options: MarketingRouteDefinition) => {
      captured.routes.set(path, options)

      return options
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({
    actions,
    breadcrumbs,
    description,
    title,
  }: Readonly<{
    actions?: ReactNode
    breadcrumbs?: readonly { href?: string; label: string }[]
    description?: string
    title: ReactNode
  }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <nav aria-label="breadcrumbs">{breadcrumbs?.map((crumb) => `${crumb.label}:${String(crumb.href)}`).join("|")}</nav>
      <div data-testid="actions">{actions}</div>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats", () => ({
  NewsletterStats: (): JSX.Element => <section data-testid="newsletter-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/newsletter-campaigns-table", () => ({
  NewsletterCampaignsTable: (): JSX.Element => <section data-testid="newsletter-campaigns-table" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/newsletter-composer", () => ({
  NewsletterComposer: (): JSX.Element => <section data-testid="newsletter-composer" />,
}))
vi.mock("~/src/modules/newsletter/use-cases/get-newsletter-stats", () => ({
  getNewsletterStatsQuery: () => ({ queryFn: () => remote.stats(), queryKey: ["admin", "newsletter", "stats"] }),
}))
vi.mock("~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns", () => ({
  getAdminNewsletterCampaignsQuery: () => ({ queryFn: () => remote.campaigns(), queryKey: ["admin", "newsletter-campaign", "list"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/admin.marketing.index")
await import("~/src/routes/admin.marketing.new")

const routeAt = (path: string): MarketingRouteDefinition => {
  const route = captured.routes.get(path)
  if (route === undefined) {
    throw new Error(`no route registered at ${path}`)
  }

  return route
}

const renderRoute = (path: string) => {
  const Component = routeAt(path).component
  if (Component === undefined) {
    throw new Error(`the route at ${path} registered no component`)
  }

  return renderWithProviders(<Component />)
}

const runLoader = async (path: string, queryClient: QueryClient): Promise<void> => {
  await routeAt(path).loader?.({ context: { queryClient } })
}

beforeEach(() => {
  vi.clearAllMocks()
  remote.campaigns.mockResolvedValue([])
  remote.stats.mockResolvedValue({ confirmed: 2, pending: 1, total: 3, unsubscribed: 0 })
})

afterEach(cleanup)

describe("admin marketing page", () => {
  it("heads the page as the newsletter and links back to the dashboard", () => {
    renderRoute("/admin/marketing/")

    expect(screen.getByRole("heading", { name: "Newsletter" })).toBeInTheDocument()
    expect(screen.getByText("Write to confirmed subscribers and follow every letter you send.")).toBeInTheDocument()
    expect(screen.getByLabelText("breadcrumbs")).toHaveTextContent("Dashboard:/admin")
  })

  it("links the header action to the newsletter composer", () => {
    renderRoute("/admin/marketing/")

    expect(screen.getByRole("link", { name: "New newsletter" })).toHaveAttribute("href", "/admin/marketing/new")
  })

  it("shows the subscriber counts above the sent newsletters", () => {
    renderRoute("/admin/marketing/")

    const stats = screen.getByTestId("newsletter-stats")
    const campaigns = screen.getByTestId("newsletter-campaigns-table")

    expect(stats.compareDocumentPosition(campaigns) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("loads the subscriber counts and the sent newsletters before the page renders", async () => {
    const queryClient = new QueryClient()

    await runLoader("/admin/marketing/", queryClient)

    expect(queryClient.getQueryData(["admin", "newsletter", "stats"])).toStrictEqual({
      confirmed: 2,
      pending: 1,
      total: 3,
      unsubscribed: 0,
    })
    expect(queryClient.getQueryData(["admin", "newsletter-campaign", "list"])).toStrictEqual([])
  })
})

describe("admin newsletter composer page", () => {
  it("renders the composer", () => {
    renderRoute("/admin/marketing/new")

    expect(screen.getByTestId("newsletter-composer")).toBeInTheDocument()
  })

  it("loads the confirmed subscriber count before the composer renders", async () => {
    const queryClient = new QueryClient()

    await runLoader("/admin/marketing/new", queryClient)

    expect(remote.stats).toHaveBeenCalledOnce()
    expect(remote.campaigns).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(["admin", "newsletter", "stats"])).toMatchObject({ confirmed: 2 })
  })
})

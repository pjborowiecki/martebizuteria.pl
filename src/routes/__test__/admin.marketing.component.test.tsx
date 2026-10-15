import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface MarketingRouteDefinition {
  readonly component?: (() => JSX.Element) | undefined
  readonly loader?: (ctx: Readonly<{ context: { queryClient: QueryClient }; deps: SubscribersSearch }>) => Promise<void>
  readonly loaderDeps?: (ctx: Readonly<{ search: SubscribersSearch }>) => SubscribersSearch
  readonly validateSearch?: { readonly safeParse: (input: unknown) => { readonly success: boolean } }
}

interface SubscribersSearch {
  readonly status?: string | undefined
}

const captured = vi.hoisted(() => ({ routes: new Map<string, MarketingRouteDefinition>(), search: {} as SubscribersSearch }))

const remote = vi.hoisted(() => ({
  campaigns: vi.fn<() => Promise<unknown>>(),
  page: vi.fn<(input: unknown) => Promise<unknown>>(),
  stats: vi.fn<() => Promise<unknown>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: (path: string) => (options: MarketingRouteDefinition) => {
      captured.routes.set(path, options)

      return { ...options, useSearch: () => captured.search }
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({
    actions,
    breadcrumbs,
    description,
    tabs,
    title,
  }: Readonly<{
    actions?: ReactNode
    breadcrumbs?: readonly { href?: string; label: string }[]
    description?: string
    tabs?: ReactNode
    title: ReactNode
  }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <nav aria-label="breadcrumbs">{breadcrumbs?.map((crumb) => `${crumb.label}:${String(crumb.href)}`).join("|")}</nav>
      <div data-testid="actions">{actions}</div>
      <div data-testid="tabs">{tabs}</div>
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
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-table", () => ({
  NewsletterSubscribersTableContent: ({ initialStatus }: Readonly<{ initialStatus: string | undefined }>): JSX.Element => (
    <section data-testid="newsletter-subscribers-table">{initialStatus ?? "every status"}</section>
  ),
}))
vi.mock("~/src/modules/newsletter/use-cases/get-newsletter-stats", () => ({
  getNewsletterStatsQuery: () => ({ queryFn: () => remote.stats(), queryKey: ["admin", "newsletter", "stats"] }),
}))
vi.mock("~/src/modules/newsletter/use-cases/get-admin-newsletter-page", () => ({
  getAdminNewsletterPageQuery: (input: unknown) => ({
    queryFn: () => remote.page(input),
    queryKey: ["admin", "newsletter", "page", input],
  }),
}))
vi.mock("~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns", () => ({
  getAdminNewsletterCampaignsQuery: () => ({ queryFn: () => remote.campaigns(), queryKey: ["admin", "newsletter-campaign", "list"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/admin.marketing.index")
await import("~/src/routes/admin.marketing.new")
await import("~/src/routes/admin.marketing.subscribers")

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

const runLoader = async (path: string, queryClient: QueryClient, deps: SubscribersSearch = {}): Promise<void> => {
  await routeAt(path).loader?.({ context: { queryClient }, deps })
}

const SUBSCRIBERS_PAGE = { hasMore: false, items: [], limit: 50, offset: 0, total: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  captured.search = {}
  remote.campaigns.mockResolvedValue([])
  remote.page.mockResolvedValue(SUBSCRIBERS_PAGE)
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

  it("puts the newsletters tab first and marks it as the current one", () => {
    renderRoute("/admin/marketing/")

    const tabs = within(screen.getByTestId("tabs")).getAllByRole("link")

    expect(tabs.map((tab) => tab.textContent)).toStrictEqual(["Newsletters", "Subscribers"])
    expect(tabs[0]?.className).toContain("font-medium")
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

describe("admin newsletter subscribers page", () => {
  it("heads the page as the subscribers tab of the newsletter", () => {
    renderRoute("/admin/marketing/subscribers")

    expect(screen.getByRole("heading", { name: "Subscribers" })).toBeInTheDocument()
    expect(screen.getByText("Addresses signed up for the newsletter and where each subscription stands.")).toBeInTheDocument()
    expect(screen.getByLabelText("breadcrumbs")).toHaveTextContent("Dashboard:/admin")
    expect(within(screen.getByTestId("tabs")).getByRole("link", { name: "Subscribers" }).className).toContain("font-medium")
  })

  it("lists every status unless the link names one", () => {
    renderRoute("/admin/marketing/subscribers")

    expect(screen.getByTestId("newsletter-subscribers-table")).toHaveTextContent("every status")
  })

  it("opens the list on the status the link names", () => {
    captured.search = { status: "pending" }

    renderRoute("/admin/marketing/subscribers")

    expect(screen.getByTestId("newsletter-subscribers-table")).toHaveTextContent("pending")
  })

  it("accepts only the subscriber statuses in the address", () => {
    const { validateSearch } = routeAt("/admin/marketing/subscribers")

    expect(validateSearch?.safeParse({}).success).toBe(true)
    expect(validateSearch?.safeParse({ status: "unsubscribed" }).success).toBe(true)
    expect(validateSearch?.safeParse({ status: "bounced" }).success).toBe(false)
  })

  it("reloads the first page whenever the linked status changes", () => {
    expect(routeAt("/admin/marketing/subscribers").loaderDeps?.({ search: { status: "confirmed" } })).toStrictEqual({ status: "confirmed" })
  })

  it("loads the first page of the linked status and the counts before the page renders", async () => {
    const queryClient = new QueryClient()

    await runLoader("/admin/marketing/subscribers", queryClient, { status: "confirmed" })

    expect(remote.page).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 50, status: "confirmed" })
    expect(queryClient.getQueryData(["admin", "newsletter", "page", { page: 1, pageSize: 50, status: "confirmed" }])).toStrictEqual(
      SUBSCRIBERS_PAGE,
    )
    expect(queryClient.getQueryData(["admin", "newsletter", "stats"])).toMatchObject({ pending: 1 })
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

import { type JSX } from "react"

import type * as ReactQuery from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: {
    readonly context: {
      readonly locale: string
      readonly queryClient: { readonly query: (options: { readonly queryKey: readonly unknown[] }) => Promise<unknown> }
    }
    readonly params: { readonly id: string }
  }) => Promise<void>
  readonly shouldReload?: boolean
  readonly staleTime?: number
  readonly staticData?: unknown
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

const state = vi.hoisted((): { detail: unknown } => ({ detail: undefined }))

const spies = vi.hoisted(() => ({ customerQuery: vi.fn((id: string, locale?: string) => ({ queryKey: ["customer", id, locale] })) }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return { options, useParams: () => ({ id: "user-1" }) }
    },
  }
})
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactQuery>()

  return { ...actual, useSuspenseQuery: () => ({ data: state.detail }) }
})
vi.mock("~/src/modules/user/use-cases/get-admin-customer", () => ({ getAdminCustomerQuery: spies.customerQuery }))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis", () => ({
  CustomerKpis: (): JSX.Element => <p>customer kpis</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts", () => ({
  CustomerCharts: (): JSX.Element => <p>customer charts</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders", () => ({
  CustomerOrders: (): JSX.Element => <p>customer orders</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar", () => ({
  CustomerSidebar: (): JSX.Element => <aside>customer sidebar</aside>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-sheet", () => ({
  CustomerSheet: (): JSX.Element => <p>edit customer sheet</p>,
}))

await import("~/src/routes/admin.customers.$id")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin customer detail route did not register any options")
}

const detail: User["adminCustomerDetail"] = {
  averageOrderValue: 49_975,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: new Date("2023-03-04T00:00:00.000Z"),
  customTags: [],
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: false,
  joinDate: "4 Mar 2023",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  orderCount: 4,
  orders: [],
  phone: null,
  returningRate: 0,
  role: ROLES.CUSTOMER,
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 199_900,
  twoFactorEnabled: false,
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
}

const AdminCustomerDetailRoute = (): JSX.Element => {
  const Page = route.component
  if (Page === undefined) {
    throw new Error("the admin customer detail route renders no component")
  }

  return <Page />
}

const renderPage = () => renderWithProviders(<AdminCustomerDetailRoute />)

const runLoader = async (customer: unknown): Promise<unknown> => {
  try {
    await route.loader?.({
      context: { locale: "en-US", queryClient: { query: () => Promise.resolve(customer) } },
      params: { id: "user-1" },
    })
  } catch (error: unknown) {
    return error
  }

  return undefined
}

beforeEach(() => {
  vi.clearAllMocks()
  state.detail = detail
})

afterEach(cleanup)

describe("admin customer detail page", () => {
  it("titles the header with the customer's name", () => {
    renderPage()

    expect(screen.getByRole("heading", { level: 1, name: "Anna Kowalska" })).toBeInTheDocument()
  })

  it("breadcrumbs back through the dashboard and the customer list", () => {
    renderPage()

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin")
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/admin/customers")
  })

  it("reads the customer named in the url in the active locale", () => {
    renderPage()

    expect(spies.customerQuery).toHaveBeenCalledWith("user-1", "en-US")
  })

  it("lays the kpis, charts, orders and sidebar out around the customer", () => {
    renderPage()

    expect(screen.getByText("customer kpis")).toBeInTheDocument()
    expect(screen.getByText("customer charts")).toBeInTheDocument()
    expect(screen.getByText("customer orders")).toBeInTheDocument()
    expect(screen.getByText("customer sidebar")).toBeInTheDocument()
  })

  it("keeps the edit sheet closed until the admin asks for it", () => {
    renderPage()

    expect(screen.queryByText("edit customer sheet")).toBeNull()
  })

  it("opens the edit sheet from the header action", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "Edit customer" }))

    expect(screen.getByText("edit customer sheet")).toBeInTheDocument()
  })

  it("raises a not found instead of rendering a page for a customer that is gone", () => {
    state.detail = undefined
    const caught: { thrown?: unknown } = {}

    try {
      renderPage()
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(isNotFound(caught.thrown)).toBe(true)
  })
})

describe("admin customer detail route wiring", () => {
  it("keeps the prefetched customer for as long as the admin customer queries stay fresh", () => {
    expect(route.staleTime).toBe(ADMIN_CUSTOMER_QUERY_STALE_MS)
    expect(route.shouldReload).toBe(false)
  })

  it("preloads the admin customer message namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.admin.customers"] })
  })

  it("prefetches the customer the url names and lets the page render", async () => {
    expect(await runLoader(detail)).toBeUndefined()
    expect(spies.customerQuery).toHaveBeenCalledWith("user-1", "en-US")
  })
})

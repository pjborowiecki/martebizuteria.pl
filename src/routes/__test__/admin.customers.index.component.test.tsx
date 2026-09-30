import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

interface PrefetchedQuery {
  readonly queryKey: readonly unknown[]
  readonly staleTime?: unknown
}

interface CustomersRouteOptions {
  readonly loader?: (args: Readonly<{ context: { queryClient: { query: (options: PrefetchedQuery) => Promise<unknown> } } }>) => unknown
}

const prefetch = vi.hoisted(() => ({
  captured: {} as { current?: CustomersRouteOptions },
  pageInput: vi.fn<(input: unknown) => void>(),
  requested: [] as PrefetchedQuery[],
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: CustomersRouteOptions) => {
      prefetch.captured.current = options

      return { options }
    },
  }
})

vi.mock("~/src/modules/user/use-cases/get-admin-customer-stats", () => ({
  getAdminCustomerStatsQuery: () => ({ queryFn: () => Promise.resolve({}), queryKey: ["admin", "customers", "stats"] }),
}))

vi.mock("~/src/modules/user/use-cases/get-admin-customers-page", () => ({
  getAdminCustomersPageQuery: (input: unknown) => {
    prefetch.pageInput(input)

    return { queryFn: () => Promise.resolve({}), queryKey: ["admin", "customers", "page"] }
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-table", () => ({
  CustomersTableContent: (): JSX.Element => <div data-testid="customers-table" />,
}))

import { Route } from "~/src/routes/admin.customers.index"

const renderCustomers = () => {
  const CustomersIndexRoute = Route.options.component
  if (CustomersIndexRoute === undefined) {
    throw new Error("the admin customers route registered no component")
  }

  return renderWithProviders(
    <SidebarProvider>
      <CustomersIndexRoute />
    </SidebarProvider>,
  )
}

const queryClient = {
  query: (options: PrefetchedQuery) => {
    prefetch.requested.push(options)

    return Promise.resolve({})
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  prefetch.requested = []
})

afterEach(cleanup)

describe("admin customers page", () => {
  it("heads the page with its translated title and description", () => {
    renderCustomers()

    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument()
    expect(screen.getByText("Manage your customer list, view purchase history, and export data.")).toBeInTheDocument()
  })

  it("renders the customers table below the header", () => {
    renderCustomers()

    expect(screen.getByTestId("customers-table")).toBeInTheDocument()
  })

  it("declares the customers namespace so the page can be translated", () => {
    expect(Route.options.staticData?.namespaces).toStrictEqual(["pages.admin.customers"])
  })

  it("keeps the prefetched customer page between visits", () => {
    expect(Route.options.shouldReload).toBe(false)
  })

  it("holds the prefetched data for as long as the customer queries stay fresh", () => {
    expect(Route.options.staleTime).toBe(ADMIN_CUSTOMER_QUERY_STALE_MS)
  })
})

describe("admin customers loader", () => {
  it("prefetches the first customer page and the headline stats before the page renders", async () => {
    await prefetch.captured.current?.loader?.({ context: { queryClient } })

    expect(prefetch.requested.map((options) => options.queryKey)).toStrictEqual([
      ["admin", "customers", "page"],
      ["admin", "customers", "stats"],
    ])
  })

  it("asks for the first page at the admin page size", async () => {
    await prefetch.captured.current?.loader?.({ context: { queryClient } })

    expect(prefetch.pageInput).toHaveBeenCalledWith({ page: 1, pageSize: ADMIN_CUSTOMER_PAGE_SIZE })
  })

  it("keeps both prefetched queries static so the page never refetches them on entry", async () => {
    await prefetch.captured.current?.loader?.({ context: { queryClient } })

    expect(prefetch.requested.map((options) => options.staleTime)).toStrictEqual(["static", "static"])
  })
})

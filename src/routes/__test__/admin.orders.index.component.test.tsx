import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"

interface OrdersRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: { readonly context: { readonly queryClient: QueryClient } }) => Promise<void>
  readonly shouldReload?: boolean
  readonly staleTime?: number
  readonly staticData?: { readonly namespaces: readonly string[] }
}

const captured: { current: OrdersRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: OrdersRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/order/use-cases/get-admin-orders-page", () => ({
  getAdminOrdersPageQuery: (input: { readonly page: number; readonly pageSize: number }) => ({
    queryFn: () => Promise.resolve({ items: [], page: input.page, pageSize: input.pageSize, total: 0 }),
    queryKey: ["admin", "orders", "page", input],
  }),
}))
vi.mock("~/src/modules/order/use-cases/get-admin-order-stats", () => ({
  getAdminOrderStatsQuery: () => ({ queryFn: () => Promise.resolve({ open: 3, total: 7 }), queryKey: ["admin", "orders", "stats"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ description, title }: Readonly<{ description?: string; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-table", () => ({
  OrdersTableContent: (): JSX.Element => <section data-testid="orders-table" />,
}))

await import("~/src/routes/admin.orders.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin orders index route registered no options")
}

const renderOrdersPage = () => {
  const Page = route.component
  if (Page === undefined) {
    throw new Error("the admin orders index route renders no component")
  }

  return renderWithProviders(<Page />)
}

afterEach(cleanup)

describe("the admin orders page", () => {
  it("heads the page with the orders title and description", () => {
    renderOrdersPage()

    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument()
    expect(screen.getByText("Manage and track customer orders.")).toBeInTheDocument()
  })

  it("puts the orders table under the header", () => {
    renderOrdersPage()

    const header = screen.getByRole("banner")
    const table = screen.getByTestId("orders-table")

    expect(header.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe("the admin orders loader", () => {
  it("warms the first page of orders and the order stats", async () => {
    const queryClient = new QueryClient()

    await route.loader?.({ context: { queryClient } })

    expect(queryClient.getQueryData(["admin", "orders", "page", { page: 1, pageSize: ADMIN_ORDERS_PAGE_SIZE }])).toStrictEqual({
      items: [],
      page: 1,
      pageSize: ADMIN_ORDERS_PAGE_SIZE,
      total: 0,
    })
    expect(queryClient.getQueryData(["admin", "orders", "stats"])).toStrictEqual({ open: 3, total: 7 })
  })
})

describe("the admin orders route wiring", () => {
  it("keeps the warmed data for as long as the order queries stay fresh", () => {
    expect(route.staleTime).toBe(ORDER_QUERY_STALE_MS)
  })

  it("does not reload on every return to the page", () => {
    expect(route.shouldReload).toBe(false)
  })

  it("loads the customer table copy the order filters borrow", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.admin.customers"] })
  })
})

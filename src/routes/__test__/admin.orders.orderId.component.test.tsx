import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackQuery from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"

interface OrderRouteOptions {
  readonly loader?: (args: { context: { queryClient: QueryClient }; params: { orderId: string } }) => Promise<void>
}

const route = vi.hoisted(() => ({ options: undefined as OrderRouteOptions | undefined }))

const { getAdminOrderQuery, orderState, stubMutation } = vi.hoisted(() => ({
  getAdminOrderQuery: vi.fn((orderId: string) => ({
    queryFn: () => Promise.resolve(orderState.current),
    queryKey: ["admin", "orders", "detail", orderId],
  })),
  orderState: { current: undefined as Order["adminOrderDetail"] | undefined },
  stubMutation: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    createFileRoute: () => (options: OrderRouteOptions) => {
      route.options = options

      return { options, useParams: () => ({ orderId: ORDER_ID }) }
    },
  }
})
vi.mock("~/src/modules/order/use-cases/get-admin-order", () => ({ getAdminOrderQuery }))
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof TanStackQuery>("@tanstack/react-query")

  return { ...actual, useSuspenseQuery: () => ({ data: orderState.current }) }
})
vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: stubMutation,
  useFulfillOrder: stubMutation,
  useMarkOrderDelivered: stubMutation,
  useMarkOrderShipped: stubMutation,
  useRefundOrder: stubMutation,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-page", () => ({
  OrderDetailPage: (): JSX.Element => <p>order detail body</p>,
}))

import { Route } from "~/src/routes/admin.orders.$orderId"

const ORDER_ID = "a1b2c3d4-0000-0000-0000-000000000000"

const AdminOrderDetailRoute = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the admin order route renders no component")
  }

  return <Page />
}

const renderRoute = (overrides: Partial<Order["adminOrderDetail"]> = {}) => {
  orderState.current = buildAdminOrderDetail(overrides)

  return renderWithProviders(<AdminOrderDetailRoute />)
}

afterEach(cleanup)

describe("admin order detail route", () => {
  it("titles the header with the order reference from the loaded order", () => {
    renderRoute()

    expect(screen.getByRole("heading", { level: 1, name: "#A1B2C3D4" })).toBeInTheDocument()
  })

  it("breadcrumbs back through the dashboard and the order list", () => {
    renderRoute()

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin")
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders")
  })

  it("loads the order through the admin order query for the route param", () => {
    renderRoute()

    expect(getAdminOrderQuery).toHaveBeenCalledWith(ORDER_ID)
  })

  it("renders the order detail body under the header", () => {
    renderRoute()

    expect(screen.getByText("order detail body")).toBeInTheDocument()
  })

  it("offers refund, cancel and ship for a paid order already in fulfillment", () => {
    renderRoute()

    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refund" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel order" })).toBeInTheDocument()
  })

  it("offers fulfillment only while the order is unfulfilled", () => {
    renderRoute({ fulfillmentStatus: "not_fulfilled", fulfillmentUiKey: "unfulfilled" })

    expect(screen.getByRole("button", { name: "Fulfill" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mark delivered" })).not.toBeInTheDocument()
  })

  it("offers the delivery hand-off once the parcel has shipped", () => {
    renderRoute({ fulfillmentStatus: "shipped" })

    expect(screen.getByRole("button", { name: "Mark delivered" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fulfill" })).not.toBeInTheDocument()
  })

  it("withholds every state-changing action from a cancelled order", () => {
    renderRoute({ canceledAt: new Date("2026-03-08T08:00:00.000Z"), fulfillmentStatus: "cancelled", status: "cancelled" })

    expect(screen.queryByRole("button", { name: "Refund" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fulfill" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument()
  })
})

const loadOrder = (queryClient: QueryClient) => {
  const loader = route.options?.loader
  if (loader === undefined) {
    throw new Error("the admin order route registered no loader")
  }

  return loader({ context: { queryClient }, params: { orderId: ORDER_ID } })
}

const cachedOrder = (queryClient: QueryClient) => queryClient.getQueryCache().find({ queryKey: getAdminOrderQuery(ORDER_ID).queryKey })

describe("admin order detail loader", () => {
  it("preloads the order named by the route param", async () => {
    orderState.current = buildAdminOrderDetail()
    const queryClient = new QueryClient()

    await loadOrder(queryClient)

    expect(getAdminOrderQuery).toHaveBeenCalledWith(ORDER_ID)
    expect(cachedOrder(queryClient)?.state.data).toBe(orderState.current)
  })

  it("serves a revisit from the order already in the cache", async () => {
    orderState.current = buildAdminOrderDetail()
    const queryClient = new QueryClient()

    await loadOrder(queryClient)
    await loadOrder(queryClient)

    expect(cachedOrder(queryClient)?.state.dataUpdateCount).toBe(1)
  })
})

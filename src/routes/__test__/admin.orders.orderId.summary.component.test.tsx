import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackQuery from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"

interface SummaryRouteOptions {
  readonly beforeLoad?: unknown
  readonly component?: () => JSX.Element
  readonly loader?: (args: { context: { queryClient: QueryClient }; params: { orderId: string } }) => Promise<void>
  readonly staticData?: { readonly namespaces: readonly string[] }
}

const ORDER_ID = "a1b2c3d4-0000-0000-0000-000000000000"

const route = vi.hoisted(() => ({ options: undefined as SummaryRouteOptions | undefined, path: undefined as string | undefined }))

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }))

const { getAdminOrderQuery, orderState } = vi.hoisted(() => ({
  getAdminOrderQuery: vi.fn((orderId: string) => ({
    queryFn: () => Promise.resolve(orderState.current),
    queryKey: ["admin", "orders", "detail", orderId],
  })),
  orderState: { current: undefined as Order["adminOrderDetail"] | undefined },
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    createFileRoute: (path: string) => (options: SummaryRouteOptions) => {
      route.options = options
      route.path = path

      return { options, useParams: () => ({ orderId: ORDER_ID }) }
    },
  }
})
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof TanStackQuery>("@tanstack/react-query")

  return { ...actual, useSuspenseQuery: () => ({ data: orderState.current }) }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => guard)
vi.mock("~/src/modules/order/use-cases/get-admin-order", () => ({ getAdminOrderQuery }))

await import("~/src/routes/admin_.orders.$orderId.summary")

const options = (): SummaryRouteOptions => {
  if (route.options === undefined) {
    throw new Error("the order summary route registered no options")
  }

  return route.options
}

afterEach(cleanup)

describe("admin order summary route", () => {
  it("sits outside the admin layout, so the printout carries no sidebar", () => {
    expect(route.path).toBe("/admin_/orders/$orderId/summary")
  })

  it("admits only an admin who passes the panel's own guard", () => {
    expect(options().beforeLoad).toBe(guard.requireAdmin)
  })

  it("loads the admin messages", () => {
    expect(options().staticData?.namespaces).toStrictEqual(["pages.admin"])
  })

  it("renders the summary of the order named by the route param", () => {
    orderState.current = buildAdminOrderDetail({ billingCompanyName: "Pracownia Złotnicza sp. z o.o." })
    const Page = options().component
    if (Page === undefined) {
      throw new Error("the order summary route renders no component")
    }

    renderWithProviders(<Page />)

    expect(getAdminOrderQuery).toHaveBeenCalledWith(ORDER_ID)
    expect(screen.getByRole("heading", { level: 1, name: "Order summary" })).toBeInTheDocument()
    expect(screen.getByText("Pracownia Złotnicza sp. z o.o.")).toBeInTheDocument()
  })

  it("preloads the order through the shared admin order query as already fresh", async () => {
    orderState.current = buildAdminOrderDetail()
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query")

    await options().loader?.({ context: { queryClient }, params: { orderId: ORDER_ID } })

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["admin", "orders", "detail", ORDER_ID], staleTime: "static" }))
    expect(queryClient.getQueryData(["admin", "orders", "detail", ORDER_ID])).toBe(orderState.current)
  })
})

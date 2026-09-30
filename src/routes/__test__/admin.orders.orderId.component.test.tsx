import { type JSX } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ orderId: "ORDER-42" }) }) }
})
vi.mock("~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-page", () => ({
  OrderDetailPage: (): JSX.Element => <p>order detail body</p>,
}))

import { Route } from "~/src/routes/admin.orders.$orderId"

const AdminOrderDetailRoute = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the admin order route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("admin order detail route", () => {
  it("titles the header with the order reference from the url", () => {
    renderWithProviders(<AdminOrderDetailRoute />)

    expect(screen.getByRole("heading", { level: 1, name: "#ORDER-42" })).toBeInTheDocument()
  })

  it("breadcrumbs back through the dashboard and the order list", () => {
    renderWithProviders(<AdminOrderDetailRoute />)

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin")
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders")
  })

  it("offers the fulfilment actions of an order", () => {
    renderWithProviders(<AdminOrderDetailRoute />)

    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refund" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fulfill" })).toBeInTheDocument()
  })

  it("renders the order detail body under the header", () => {
    renderWithProviders(<AdminOrderDetailRoute />)

    expect(screen.getByText("order detail body")).toBeInTheDocument()
  })
})

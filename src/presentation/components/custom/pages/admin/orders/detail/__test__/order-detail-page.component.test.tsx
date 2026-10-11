import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-inpost-shipment-actions", () => ({
  useCreateInpostShipment: () => ({ isPending: false, mutate: vi.fn() }),
  useDownloadInpostLabel: () => ({ isPending: false, mutate: vi.fn() }),
  useRefreshInpostShipment: () => ({ isPending: false, mutate: vi.fn() }),
}))

import {
  ORDER_ITEM,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderDetailPage } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-page"

afterEach(() => {
  cleanup()
})

describe("OrderDetailPage", () => {
  it("assembles every card of the order detail view", () => {
    renderWithProviders(<OrderDetailPage order={buildAdminOrderDetail()} />)

    for (const title of [
      "Fulfillment",
      "Items",
      "Activity",
      "Customer",
      "Shipping Address",
      "InPost shipment",
      "Billing Address",
      "Payment",
      "Tags",
      "Customer Note",
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
  })

  it("shows a customer's withdrawal from the contract with the order", () => {
    const order = buildAdminOrderDetail({
      withdrawals: [
        {
          consumerName: "Anna Kowalska",
          email: "anna@example.com",
          id: "withdrawal-1",
          items: undefined,
          reason: undefined,
          scope: "order",
          submittedAt: new Date("2026-10-10T12:30:00.000Z"),
        },
      ],
    })
    renderWithProviders(<OrderDetailPage order={order} />)

    expect(screen.getByText("Withdrawal from the contract")).toBeInTheDocument()
    expect(screen.getByText("The whole order")).toBeInTheDocument()
  })

  it("shows the meta strip labels above the cards", () => {
    renderWithProviders(<OrderDetailPage order={buildAdminOrderDetail()} />)

    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getAllByText("Total").length).toBeGreaterThan(0)
  })

  it("renders the line items and the activity feed from the loaded order", () => {
    const order = buildAdminOrderDetail({ items: [ORDER_ITEM, { ...ORDER_ITEM, id: "item-2" }] })
    const { container } = renderWithProviders(<OrderDetailPage order={order} />)

    expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
    expect(screen.getByText("Order shipped")).toBeInTheDocument()
  })

  it("splits the view into a main column and a sidebar", () => {
    const { container } = renderWithProviders(<OrderDetailPage order={buildAdminOrderDetail()} />)

    expect(container.querySelector(".grid")?.children).toHaveLength(2)
  })
})

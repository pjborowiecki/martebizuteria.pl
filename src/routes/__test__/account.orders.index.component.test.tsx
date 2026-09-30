import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))

vi.mock("~/src/modules/customer-account/use-cases/list-customer-orders", () => ({
  listCustomerOrdersQuery: () => ({
    queryFn: () => Promise.resolve(ordersRef.current),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS,
  }),
}))

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }): JSX.Element => <img alt={alt} src={src} />,
}))

import { Route } from "~/src/routes/account.orders.index"

const CREATED_AT = new Date("2026-03-14T10:00:00.000Z")

const orderSummary = (overrides: Partial<CustomerAccount["orderSummary"]> = {}): CustomerAccount["orderSummary"] => ({
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  filterStatus: "shipped",
  fulfillmentStatus: "shipped",
  id: "0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee",
  orderNumber: "MRT-2026-00007",
  items: [{ image: "products/aurora.jpg", name: "Bransoletka Aurora", priceMinorUnits: 24_900, qty: 2 }],
  status: "processing",
  totalMinorUnits: 49_800,
  ...overrides,
})

const ordersRef: { current: readonly CustomerAccount["orderSummary"][] } = { current: [] }

const lastElement = (elements: readonly HTMLElement[]): HTMLElement => {
  const element = elements.at(-1)
  if (element === undefined) {
    throw new Error("expected at least one rendered element")
  }

  return element
}

const renderOrders = () => {
  const OrdersPage = Route.options.component
  if (OrdersPage === undefined) {
    throw new Error("the account orders route registered no component")
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS, ordersRef.current)

  return renderWithProviders(<OrdersPage />, { queryClient })
}

beforeEach(() => {
  ordersRef.current = []
})

afterEach(cleanup)

describe("account orders page", () => {
  it("titles the page", () => {
    renderOrders()

    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument()
    expect(screen.getByText("Your Collection")).toBeInTheDocument()
  })

  it("says there is nothing to show when the customer has no orders", () => {
    renderOrders()

    expect(screen.getByText("No orders found.")).toBeInTheDocument()
  })

  it("offers one button per order filter", () => {
    renderOrders()

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toStrictEqual([
      "All",
      "Delivered",
      "Shipped",
      "Processing",
      "Cancelled",
    ])
  })

  it("lists an order by its number, date, total and status", () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    expect(screen.getByText("MRT-2026-00007")).toBeInTheDocument()
    expect(screen.getByText("Mar 14, 2026")).toBeInTheDocument()
    expect(screen.getByText("PLN 498.00")).toBeInTheDocument()
    expect(screen.getByText("Shipped", { selector: "p" })).toBeInTheDocument()
  })

  it("shows at most three order thumbnails in the row header", () => {
    ordersRef.current = [
      orderSummary({
        items: [
          { image: "a.jpg", name: "One", priceMinorUnits: 100, qty: 1 },
          { image: "b.jpg", name: "Two", priceMinorUnits: 100, qty: 1 },
          { image: "c.jpg", name: "Three", priceMinorUnits: 100, qty: 1 },
          { image: "d.jpg", name: "Four", priceMinorUnits: 100, qty: 1 },
        ],
      }),
    ]
    renderOrders()

    const header = lastElement(screen.getAllByRole("button"))

    expect(within(header).getAllByRole("img")).toHaveLength(3)
  })

  it("falls back to the placeholder image for an item with no picture", () => {
    ordersRef.current = [orderSummary({ items: [{ name: "Bransoletka Aurora", priceMinorUnits: 100, qty: 1 }] })]
    renderOrders()

    expect(screen.getAllByRole("img", { name: "Bransoletka Aurora" })[0]).toHaveAttribute("src", "/placeholder-product.svg")
  })

  it("keeps only the orders that match the chosen filter", async () => {
    ordersRef.current = [
      orderSummary({ id: "aaaa1111-0000-0000-0000-000000000000" }),
      orderSummary({
        filterStatus: "cancelled",
        fulfillmentStatus: "cancelled",
        id: "bbbb2222-0000-0000-0000-000000000000",
        orderNumber: "MRT-2026-00009",
        status: "cancelled",
      }),
    ]
    renderOrders()

    await userEvent.click(screen.getByRole("button", { name: "Cancelled" }))

    expect(screen.queryByText("#AAAA1111")).toBeNull()
    expect(screen.getByText("MRT-2026-00009")).toBeInTheDocument()
  })

  it("says nothing matches once a filter empties the list", async () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    await userEvent.click(screen.getByRole("button", { name: "Delivered" }))

    expect(screen.getByText("No orders found.")).toBeInTheDocument()
  })

  it("restores the full list from the all filter", async () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    await userEvent.click(screen.getByRole("button", { name: "Delivered" }))
    await userEvent.click(screen.getByRole("button", { name: "All" }))

    expect(screen.getByText("MRT-2026-00007")).toBeInTheDocument()
  })

  it("lists the line items of an order with their quantity and price", () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    expect(screen.getByText("Bransoletka Aurora")).toBeInTheDocument()
    expect(screen.getByText("Qty: 2")).toBeInTheDocument()
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
  })

  it("links each order to its own detail page", () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      expect.stringContaining("0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee"),
    )
  })

  it("expands and collapses the details of an order", async () => {
    ordersRef.current = [orderSummary()]
    renderOrders()

    const header = lastElement(screen.getAllByRole("button"))
    expect(screen.getByText("Bransoletka Aurora").closest("div.grid")).toHaveClass("grid-rows-[0fr]")

    await userEvent.click(header)

    expect(screen.getByText("Bransoletka Aurora").closest("div.grid")).toHaveClass("grid-rows-[1fr]")
  })
})

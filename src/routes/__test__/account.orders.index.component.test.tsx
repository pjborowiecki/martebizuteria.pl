import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const searchState: { current: { filter: string; page: number } } = { current: { filter: "all", page: 1 } }

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => ({ options, useSearch: () => searchState.current }),
  }
})
vi.mock("~/src/modules/customer-account/use-cases/list-customer-orders", () => ({
  listCustomerOrdersQuery: () => ({
    queryFn: () => Promise.resolve(pageRef.current),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS,
  }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }): JSX.Element => <img alt={alt} src={src} />,
}))

import { Route } from "~/src/routes/account.orders.index"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

const CREATED_AT = new Date("2026-03-14T10:00:00.000Z")

const orderItem = (overrides: Partial<CustomerAccount["orderItem"]> = {}): CustomerAccount["orderItem"] => ({
  handle: "aurora-bracelet",
  id: "item-1",
  image: "products/aurora.jpg",
  lineTotalMinorUnits: 49_800,
  name: "Bransoletka Aurora",
  qty: 2,
  unitPriceMinorUnits: 24_900,
  variantTitle: "Size S",
  ...overrides,
})

const orderSummary = (overrides: Partial<CustomerAccount["orderSummary"]> = {}): CustomerAccount["orderSummary"] => ({
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  filterStatus: "shipped",
  fulfillmentStatus: "shipped",
  id: "0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee",
  itemCount: 2,
  items: [orderItem()],
  orderNumber: "MRT-2026-00007",
  status: "processing",
  totalMinorUnits: 49_800,
  ...overrides,
})

const ordersPage = (overrides: Partial<CustomerAccount["ordersPage"]> = {}): CustomerAccount["ordersPage"] => ({
  orders: [],
  page: 1,
  pageSize: 10,
  total: 0,
  ...overrides,
})

const pageRef: { current: CustomerAccount["ordersPage"] } = { current: ordersPage() }

const renderOrders = () => {
  const OrdersPage = Route.options.component
  if (OrdersPage === undefined) {
    throw new Error("the account orders route registered no component")
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS, pageRef.current)

  return renderWithProviders(<OrdersPage />, { queryClient })
}

const orderToggle = (): HTMLElement => {
  const toggle = screen.getAllByRole("button", { expanded: false }).at(-1) ?? screen.getAllByRole("button").at(-1)
  if (toggle === undefined) {
    throw new Error("expected an order row toggle")
  }

  return toggle
}

beforeEach(() => {
  pageRef.current = ordersPage()
  searchState.current = { filter: "all", page: 1 }
})

afterEach(cleanup)

describe("account orders page", () => {
  it("titles the page", () => {
    renderOrders()

    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument()
    expect(screen.getByText("Your Collection")).toBeInTheDocument()
  })

  it("invites a customer who has never ordered into the catalogue", () => {
    renderOrders()

    expect(screen.getByText("You have not placed an order yet.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse Products" })).toHaveAttribute("href", "/products")
  })

  it("names the filter that came back empty and offers a way out of it", () => {
    searchState.current = { filter: "delivered", page: 1 }
    renderOrders()

    expect(screen.getByText("No Delivered orders.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Show all orders" })).toBeInTheDocument()
  })

  it("offers one link per order filter, including refunded orders", () => {
    renderOrders()

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toStrictEqual([
      "All",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Refunded",
      "Browse Products",
    ])
  })

  it("keeps the chosen filter in the url so it survives a reload", () => {
    renderOrders()

    expect(screen.getByRole("link", { name: "Cancelled" })).toHaveAttribute("href", "/account/orders?filter=cancelled&page=1")
  })

  it("marks the active filter for assistive technology", () => {
    searchState.current = { filter: "shipped", page: 1 }
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    expect(screen.getByRole("link", { name: "Shipped" })).toHaveAttribute("aria-current", "page")
  })

  it("lists an order by its number, date, total and status", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    expect(screen.getByText("MRT-2026-00007")).toBeInTheDocument()
    expect(screen.getByText("Mar 14, 2026")).toBeInTheDocument()
    expect(screen.getAllByText(/PLN 498.00/u).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Shipped/u).length).toBeGreaterThan(0)
  })

  it("shows the total and status on a phone as well as on a wide screen", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    const header = orderToggle()
    const mobileLine = within(header).getByText(/PLN 498.00/u, { selector: "p.sm\\:hidden" })

    expect(mobileLine).toHaveTextContent("Shipped")
  })

  it("shows at most three order thumbnails and counts the rest", () => {
    pageRef.current = ordersPage({
      orders: [
        orderSummary({
          itemCount: 4,
          items: [
            orderItem({ id: "a", name: "One" }),
            orderItem({ id: "b", name: "Two" }),
            orderItem({ id: "c", name: "Three" }),
            orderItem({ id: "d", name: "Four" }),
          ],
        }),
      ],
      total: 1,
    })
    renderOrders()

    const header = orderToggle()

    expect(within(header).getAllByRole("img")).toHaveLength(3)
    expect(within(header).getByText("+1")).toBeInTheDocument()
  })

  it("falls back to the shared placeholder image for an item with no picture", () => {
    pageRef.current = ordersPage({ orders: [orderSummary({ items: [orderItem({ image: undefined })] })], total: 1 })
    renderOrders()

    expect(screen.getAllByRole("img", { name: "Bransoletka Aurora" })[0]).toHaveAttribute("src", PLACEHOLDER_IMAGE)
  })

  it("keeps collapsed order details out of the page", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    expect(screen.queryByRole("link", { name: "View Details" })).toBeNull()
    expect(orderToggle()).toHaveAttribute("aria-expanded", "false")
  })

  it("expands an order to its line items and links to the order", async () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    await userEvent.click(orderToggle())

    expect(screen.getByText("Size S")).toBeInTheDocument()
    expect(screen.getByText("Qty: 2 · PLN 249.00 each")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      expect.stringContaining("0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee"),
    )
  })

  it("names the control the toggle expands", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    expect(orderToggle().getAttribute("aria-controls")).not.toBeNull()
  })
})

describe("account orders paging", () => {
  beforeEach(() => {
    pageRef.current = ordersPage()
    searchState.current = { filter: "all", page: 1 }
  })

  afterEach(cleanup)

  it("stays quiet while every order fits on one page", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 1 })
    renderOrders()

    expect(screen.queryByText("Next")).toBeNull()
  })

  it("offers the next page once the orders no longer fit", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], total: 24 })
    renderOrders()

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/account/orders?filter=all&page=2")
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull()
  })

  it("offers both directions in the middle of the history and keeps the filter", () => {
    searchState.current = { filter: "delivered", page: 2 }
    pageRef.current = ordersPage({ orders: [orderSummary()], page: 2, total: 24 })
    renderOrders()

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/account/orders?filter=delivered&page=1")
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/account/orders?filter=delivered&page=3")
  })

  it("stops offering a next page at the end of the history", () => {
    pageRef.current = ordersPage({ orders: [orderSummary()], page: 3, total: 24 })
    renderOrders()

    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull()
  })
})

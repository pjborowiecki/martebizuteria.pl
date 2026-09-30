import { type JSX, Suspense } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const state = vi.hoisted((): { order: unknown } => ({ order: undefined }))

const spies = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  writeText: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("sonner", () => ({ toast: { error: spies.toastError, success: spies.toastSuccess } }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ id: "a1b2c3d4-0000-0000-0000-000000000000" }) }),
    useNavigate: () => spies.navigate,
  }
})
vi.mock("~/src/modules/customer-account/use-cases/get-customer-order", () => ({
  getCustomerOrderQuery: (orderId: string) => ({
    queryFn: () => Promise.resolve(state.order),
    queryKey: ["customer-account", "order", orderId],
  }),
}))

import { Route } from "~/src/routes/account.orders.$id"

const OrderDetailPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the order detail route renders no component")
  }

  return <Page />
}

const PLACED_AT = new Date("2026-02-01T10:00:00.000Z")

const order = (overrides: Partial<CustomerAccount["orderDetail"]> = {}): CustomerAccount["orderDetail"] => ({
  createdAt: PLACED_AT,
  currencyCode: "PLN",
  filterStatus: "shipped",
  fulfillmentStatus: "shipped",
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  orderNumber: "MRT-2026-00007",
  items: [{ name: "Silver ring", priceMinorUnits: 12_000, qty: 2 }],
  shippingMinorUnits: 1500,
  status: "completed",
  subtotalMinorUnits: 24_000,
  taxMinorUnits: 500,
  timeline: [
    { date: PLACED_AT, event: "placed" },
    { date: PLACED_AT, event: "confirmed" },
  ],
  totalMinorUnits: 26_000,
  ...overrides,
})

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading order</p>}>
      <OrderDetailPage />
    </Suspense>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.order = order()
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: spies.writeText }, writable: true })
})

afterEach(cleanup)

describe("account order detail header", () => {
  it("shows the order number as the page heading", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1, name: "MRT-2026-00007" })).toBeInTheDocument()
  })

  it("names the order status", async () => {
    renderPage()

    expect(await screen.findByText("Shipped")).toBeInTheDocument()
  })

  it("dates the order", async () => {
    renderPage()

    expect(await screen.findAllByText("Feb 1, 2026")).not.toHaveLength(0)
  })

  it("takes the customer back to the order list", async () => {
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Back to Orders" }))

    expect(spies.navigate).toHaveBeenCalledWith({ to: "/account/orders" })
  })
})

describe("account order detail totals", () => {
  it("prices every line of the summary in the order currency", async () => {
    renderPage()

    expect(await screen.findByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("PLN 240.00")).toBeInTheDocument()
    expect(screen.getByText("PLN 15.00")).toBeInTheDocument()
    expect(screen.getByText("PLN 5.00")).toBeInTheDocument()
    expect(screen.getByText("PLN 260.00")).toBeInTheDocument()
  })

  it("calls a shipment with no cost free", async () => {
    state.order = order({ shippingMinorUnits: 0 })
    renderPage()

    expect(await screen.findByText("Free")).toBeInTheDocument()
  })
})

describe("account order detail items", () => {
  it("lists every item with its quantity and price", async () => {
    renderPage()

    expect(await screen.findByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Qty: 2")).toBeInTheDocument()
    expect(screen.getByText("PLN 120.00")).toBeInTheDocument()
  })

  it("shows the variant of an item that has one", async () => {
    state.order = order({ items: [{ name: "Silver ring", priceMinorUnits: 12_000, qty: 1, variantTitle: "Size 12" }] })
    renderPage()

    expect(await screen.findByText("Size 12")).toBeInTheDocument()
  })

  it("falls back to the placeholder image for an item with no photo", async () => {
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.getByRole("img", { name: "Silver ring" }).getAttribute("src")).toContain("/placeholder-product.svg")
  })
})

describe("account order detail tracking", () => {
  it("shows nothing about delivery for an order with no tracking", async () => {
    state.order = order()
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.queryByText("Tracking not available yet.")).toBeNull()
  })

  it("admits that tracking is not available yet", async () => {
    state.order = order({ trackingNumber: "PL123" })
    renderPage()

    expect(await screen.findByText("Tracking not available yet.")).toBeInTheDocument()
    expect(screen.getByText("PL123")).toBeInTheDocument()
  })

  it("dates the delivery once it happened", async () => {
    state.order = order({ deliveredAt: new Date("2026-02-05T10:00:00.000Z") })
    renderPage()

    expect(await screen.findByText("Delivered on Feb 5, 2026")).toBeInTheDocument()
  })

  it("links the tracking number when a tracking url is known", async () => {
    state.order = order({ trackingNumber: "PL123", trackingUrl: "https://tracking.test/PL123" })
    renderPage()

    expect(await screen.findByRole("link", { name: "PL123" })).toHaveAttribute("href", "https://tracking.test/PL123")
  })

  it("copies the tracking number to the clipboard", async () => {
    spies.writeText.mockResolvedValue(undefined)
    state.order = order({ trackingNumber: "PL123" })
    renderPage()
    await screen.findByText("PL123")

    await userEvent.click(screen.getAllByRole("button")[1] ?? document.body)

    expect(spies.writeText).toHaveBeenCalledWith("PL123")
    expect(spies.toastSuccess).toHaveBeenCalledWith("PL123")
  })

  it("reports a clipboard the browser refused", async () => {
    spies.writeText.mockRejectedValue(new Error("denied"))
    state.order = order({ trackingNumber: "PL123" })
    renderPage()
    await screen.findByText("PL123")

    await userEvent.click(screen.getAllByRole("button")[1] ?? document.body)

    expect(spies.toastError).toHaveBeenCalledWith("PL123")
  })
})

describe("account order detail addresses", () => {
  it("dashes the shipping address the order never had", async () => {
    renderPage()

    expect(await screen.findByText("Shipping Address")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("prints the shipping address line by line", async () => {
    state.order = order({
      shippingAddress: {
        city: "Warszawa",
        countryCode: "PL",
        line1: "ul. Krucza 1",
        line2: "apt. 4",
        name: "Anna Kowalska",
        postalCode: "00-001",
      },
    })
    renderPage()

    expect(await screen.findByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("ul. Krucza 1")).toBeInTheDocument()
    expect(screen.getByText("apt. 4")).toBeInTheDocument()
    expect(screen.getByText("00-001 Warszawa")).toBeInTheDocument()
    expect(screen.getByText("PL")).toBeInTheDocument()
  })

  it("leaves out the second line the address does not have", async () => {
    state.order = order({
      shippingAddress: { city: "Warszawa", countryCode: "PL", line1: "ul. Krucza 1", name: "Anna Kowalska", postalCode: "00-001" },
    })
    renderPage()
    await screen.findByText("Anna Kowalska")

    expect(screen.queryByText("apt. 4")).toBeNull()
  })

  it("names the payment provider and the billing address", async () => {
    state.order = order({
      billingAddress: { city: "Krakow", countryCode: "PL", line1: "Dluga 1", name: "Anna Kowalska", postalCode: "30-001" },
      paymentProvider: "stripe",
    })
    renderPage()

    expect(await screen.findByText("stripe")).toBeInTheDocument()
    expect(screen.getByText("Dluga 1")).toBeInTheDocument()
    expect(screen.getByText("30-001 Krakow")).toBeInTheDocument()
  })
})

describe("account order detail timeline", () => {
  it("lists the events the order went through", async () => {
    state.order = order({
      timeline: [
        { date: new Date("2026-02-04T10:00:00.000Z"), event: "delivered" },
        { date: new Date("2026-02-02T10:00:00.000Z"), event: "shipped" },
        { date: PLACED_AT, event: "confirmed" },
        { date: PLACED_AT, event: "placed" },
      ],
    })
    renderPage()

    expect(await screen.findByText("Timeline")).toBeInTheDocument()
    expect(screen.getByText("Order Placed")).toBeInTheDocument()
    expect(screen.getByText("Order Confirmed")).toBeInTheDocument()
    expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0)
    expect(screen.getByText("Delivered")).toBeInTheDocument()
  })
})

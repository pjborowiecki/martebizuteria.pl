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

const orderItem = (overrides: Partial<CustomerAccount["orderItem"]> = {}): CustomerAccount["orderItem"] => ({
  id: "item-1",
  lineTotalMinorUnits: 24_000,
  name: "Silver ring",
  qty: 2,
  unitPriceMinorUnits: 12_000,
  ...overrides,
})

const order = (overrides: Partial<CustomerAccount["orderDetail"]> = {}): CustomerAccount["orderDetail"] => ({
  createdAt: PLACED_AT,
  currencyCode: "PLN",
  discountMinorUnits: 0,
  filterStatus: "shipped",
  fulfillmentStatus: "shipped",
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  itemCount: 2,
  items: [orderItem()],
  orderNumber: "MRT-2026-00007",
  shippingMinorUnits: 1500,
  status: "completed",
  subtotalMinorUnits: 24_000,
  taxBasisPoints: 2300,
  taxMinorUnits: 4766,
  timeline: [
    { date: PLACED_AT, event: "confirmed" },
    { date: PLACED_AT, event: "placed" },
  ],
  totalMinorUnits: 25_500,
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
  it("adds the summary up to the total the customer paid", async () => {
    renderPage()

    expect(await screen.findByText("Subtotal")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 240.00").length).toBeGreaterThan(0)
    expect(screen.getByText("PLN 15.00")).toBeInTheDocument()
    expect(screen.getByText("PLN 255.00")).toBeInTheDocument()
  })

  it("presents the VAT as contained in the total rather than added to it", async () => {
    renderPage()

    expect(await screen.findByText(/Includes VAT \(23%\)/u)).toHaveTextContent("PLN 47.66")
  })

  it("shows the discount that brought the total down", async () => {
    state.order = order({ discountMinorUnits: 2000, totalMinorUnits: 23_500 })
    renderPage()

    expect(await screen.findByText("Discount")).toBeInTheDocument()
    expect(screen.getByText("−PLN 20.00")).toBeInTheDocument()
  })

  it("leaves the discount row out of an order that had none", async () => {
    renderPage()
    await screen.findByText("Subtotal")

    expect(screen.queryByText("Discount")).toBeNull()
  })

  it("names the delivery method in place of the generic shipping label", async () => {
    state.order = order({ deliveryMethodName: "Kurier InPost" })
    renderPage()

    expect(await screen.findByText("Kurier InPost")).toBeInTheDocument()
  })

  it("calls a shipment with no cost free", async () => {
    state.order = order({ shippingMinorUnits: 0 })
    renderPage()

    expect(await screen.findByText("Free")).toBeInTheDocument()
  })

  it("shows what was refunded and when", async () => {
    state.order = order({
      filterStatus: "refunded",
      refund: { amountMinorUnits: 25_500, refundedAt: new Date("2026-02-20T10:00:00.000Z") },
      status: "refunded",
    })
    renderPage()

    expect(await screen.findByText("Refunded on Feb 20, 2026")).toBeInTheDocument()
    expect(screen.getByText("−PLN 255.00")).toBeInTheDocument()
  })

  it("keeps refund wording off an order that was never refunded", async () => {
    renderPage()
    await screen.findByText("Subtotal")

    expect(screen.queryByText(/Refunded/u)).toBeNull()
  })
})

describe("account order detail items", () => {
  it("prices each line by the unit price and the line total", async () => {
    renderPage()

    expect(await screen.findByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Qty: 2 · PLN 120.00 each")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 240.00").length).toBe(2)
  })

  it("shows the variant of an item that has one", async () => {
    state.order = order({ items: [orderItem({ qty: 1, variantTitle: "Size 12" })] })
    renderPage()

    expect(await screen.findByText("Size 12")).toBeInTheDocument()
  })

  it("links an item back to the product it was bought from", async () => {
    state.order = order({ items: [orderItem({ handle: "silver-ring" })] })
    renderPage()

    expect(await screen.findByRole("link", { name: "Silver ring" })).toHaveAttribute("href", "/products/silver-ring")
  })

  it("leaves an item unlinked once the product is gone", async () => {
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.queryByRole("link", { name: "Silver ring" })).toBeNull()
  })

  it("falls back to the shared placeholder image for an item with no photo", async () => {
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.getByRole("img", { name: "Silver ring" }).getAttribute("src")).toContain("placeholder.svg")
  })
})

describe("account order detail tracking", () => {
  it("shows no shipment banner for an order that has not shipped", async () => {
    state.order = order()
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.queryByText(/On its way since|Shipped on/u)).toBeNull()
  })

  it("says the parcel is on its way when it has a tracking number", async () => {
    state.order = order({ shippedAt: new Date("2026-02-03T10:00:00.000Z"), trackingNumber: "PL123" })
    renderPage()

    expect(await screen.findByText("On its way since Feb 3, 2026")).toBeInTheDocument()
    expect(screen.getByText("PL123")).toBeInTheDocument()
  })

  it("still tells the customer a parcel shipped without tracking", async () => {
    state.order = order({ shippedAt: new Date("2026-02-03T10:00:00.000Z") })
    renderPage()

    expect(await screen.findByText("Shipped on Feb 3, 2026")).toBeInTheDocument()
  })

  it("dates the delivery once it happened", async () => {
    state.order = order({ deliveredAt: new Date("2026-02-05T10:00:00.000Z") })
    renderPage()

    expect(await screen.findByText("Delivered on Feb 5, 2026")).toBeInTheDocument()
  })

  it("links the tracking number when a tracking url is known", async () => {
    state.order = order({ shippedAt: PLACED_AT, trackingNumber: "PL123", trackingUrl: "https://tracking.test/PL123" })
    renderPage()

    expect(await screen.findByRole("link", { name: "PL123" })).toHaveAttribute("href", "https://tracking.test/PL123")
  })

  it("copies the tracking number to the clipboard", async () => {
    spies.writeText.mockResolvedValue(undefined)
    state.order = order({ shippedAt: PLACED_AT, trackingNumber: "PL123" })
    renderPage()
    await screen.findByText("PL123")

    await userEvent.click(screen.getAllByRole("button")[1] ?? document.body)

    expect(spies.writeText).toHaveBeenCalledWith("PL123")
    expect(spies.toastSuccess).toHaveBeenCalledWith("PL123")
  })

  it("reports a clipboard the browser refused", async () => {
    spies.writeText.mockRejectedValue(new Error("denied"))
    state.order = order({ shippedAt: PLACED_AT, trackingNumber: "PL123" })
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

  it("describes the payment in words rather than printing the provider slug", async () => {
    state.order = order({
      billingAddress: { city: "Krakow", countryCode: "PL", line1: "Dluga 1", name: "Anna Kowalska", postalCode: "30-001" },
      paymentProvider: "stripe",
    })
    renderPage()

    expect(await screen.findByText("Paid online")).toBeInTheDocument()
    expect(screen.queryByText("stripe")).toBeNull()
    expect(screen.getByText("Dluga 1")).toBeInTheDocument()
    expect(screen.getByText("30-001 Krakow")).toBeInTheDocument()
  })

  it("shows the company and NIP a business buyer gave for their invoice", async () => {
    state.order = order({ billingCompanyName: "MARTE sp. z o.o.", billingNip: "1234567890" })
    renderPage()

    expect(await screen.findByText("MARTE sp. z o.o.")).toBeInTheDocument()
    expect(screen.getByText("NIP 1234567890")).toBeInTheDocument()
  })

  it("shows the parcel locker a locker order is going to", async () => {
    state.order = order({ deliveryMethodName: "Paczkomat InPost", lockerId: "WAW01A" })
    renderPage()

    expect(await screen.findByText("Pickup Point")).toBeInTheDocument()
    expect(screen.getByText(/WAW01A/u)).toBeInTheDocument()
  })

  it("shows the phone the courier was given", async () => {
    state.order = order({
      shippingAddress: {
        city: "Warszawa",
        countryCode: "PL",
        line1: "ul. Krucza 1",
        name: "Anna Kowalska",
        phone: "+48512345678",
        postalCode: "00-001",
      },
    })
    renderPage()

    expect(await screen.findByText("+48512345678")).toBeInTheDocument()
  })

  it("shows the note the customer left with the order", async () => {
    state.order = order({ customerNote: "Please gift wrap it" })
    renderPage()

    expect(await screen.findByText("Your Note")).toBeInTheDocument()
    expect(screen.getByText("Please gift wrap it")).toBeInTheDocument()
  })

  it("leaves the note block out when the customer left none", async () => {
    renderPage()
    await screen.findByText("Silver ring")

    expect(screen.queryByText("Your Note")).toBeNull()
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

  it("names a cancellation instead of printing the translation key", async () => {
    state.order = order({
      filterStatus: "cancelled",
      status: "cancelled",
      timeline: [
        { date: new Date("2026-02-04T10:00:00.000Z"), event: "cancelled" },
        { date: PLACED_AT, event: "placed" },
      ],
    })
    renderPage()

    expect(await screen.findByText("Order Cancelled")).toBeInTheDocument()
    expect(screen.queryByText(/pages\.account/u)).toBeNull()
  })
})

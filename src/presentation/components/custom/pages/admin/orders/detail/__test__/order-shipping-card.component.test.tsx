import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const spies = vi.hoisted(() => ({
  toastSuccess: vi.fn<(message: string) => void>(),
  writeText: vi.fn<(text: string) => Promise<void>>(() => Promise.resolve()),
}))

vi.mock("sonner", () => ({ toast: { success: spies.toastSuccess } }))

import {
  SHIPPING_ADDRESS,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderShippingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-shipping-card"

const COURIER_DELIVERY = {
  courierName: "InPost",
  lockerId: undefined,
  lockerPoint: undefined,
  lockerUnconfirmed: false,
  methodName: "Kurier InPost",
  type: "courier",
} as const

const LOCKER_DELIVERY = {
  courierName: "InPost",
  lockerId: "WAW01A",
  lockerPoint: { buildingNumber: "12", city: "Warszawa", description: "Przy stacji metra", postalCode: "00-640", street: "Mokotowska" },
  lockerUnconfirmed: false,
  methodName: "Paczkomat 24/7",
  type: "locker",
} as const

const lockerOrder = buildAdminOrderDetail({ delivery: LOCKER_DELIVERY })

const courierOrder = buildAdminOrderDetail({ delivery: COURIER_DELIVERY })

const renderCard = (detail = lockerOrder) =>
  renderWithProviders(
    <OrderShippingCard
      delivery={detail.delivery}
      shippingAddress={detail.shippingAddress}
      trackingNumber={detail.trackingNumber}
      trackingUrl={detail.trackingUrl}
    />,
  )

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: spies.writeText }, writable: true })
})

afterEach(() => {
  cleanup()
})

describe("OrderShippingCard for a parcel locker", () => {
  it("names the locker as the destination, with the address InPost gave for it", () => {
    renderCard()

    expect(screen.getByText("Destination parcel locker")).toBeInTheDocument()
    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText("Przy stacji metra")).toBeInTheDocument()
    expect(screen.getByText("Mokotowska 12")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa")).toBeInTheDocument()
  })

  it("shows the customer only as the recipient InPost texts, never as the delivery address", () => {
    renderCard()

    expect(screen.getByText("Recipient")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("+48 600 123 456")).toBeInTheDocument()
    expect(screen.queryByText("ul. Mokotowska 12/4")).not.toBeInTheDocument()
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument()
  })

  it("says the locker's address was not kept for an older order, and when no recipient was recorded", () => {
    renderCard(buildAdminOrderDetail({ delivery: { ...LOCKER_DELIVERY, lockerPoint: undefined }, shippingAddress: undefined }))

    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText(/did not keep the locker's address/u)).toBeInTheDocument()
    expect(screen.getByText("No recipient details recorded.")).toBeInTheDocument()
  })

  it("leaves out the phone of a recipient who gave none", () => {
    renderCard(buildAdminOrderDetail({ shippingAddress: { ...SHIPPING_ADDRESS, phone: undefined } }))

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.queryByText("+48 600 123 456")).not.toBeInTheDocument()
  })

  it("copies the locker's code and address and confirms it", async () => {
    renderCard()

    await userEvent.click(screen.getByRole("button", { name: "Copy parcel locker" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(["WAW01A", "Przy stacji metra", "Mokotowska 12", "00-640 Warszawa"].join("\n"))
    expect(spies.toastSuccess).toHaveBeenCalledExactlyOnceWith("Parcel locker copied")
  })

  it("asks the admin to check a locker InPost could not confirm when the order was placed", () => {
    renderCard(buildAdminOrderDetail({ delivery: { ...LOCKER_DELIVERY, lockerPoint: undefined, lockerUnconfirmed: true } }))

    expect(
      screen.getByText(
        "InPost could not be reached to confirm this parcel locker when the order was placed. Check that it exists before you send the parcel.",
      ),
    ).toBeInTheDocument()
  })

  it("says nothing about a locker InPost confirmed", () => {
    renderCard()

    expect(screen.queryByText(/InPost could not be reached/u)).toBeNull()
  })

  it("names the delivery method once when it already names the courier", () => {
    renderCard(buildAdminOrderDetail({ delivery: { ...LOCKER_DELIVERY, methodName: "Paczkomat InPost" } }))

    expect(screen.getByText("Paczkomat InPost")).toHaveTextContent(/^Paczkomat InPost$/u)
  })
})

describe("OrderShippingCard for a courier delivery", () => {
  it("prints the shipping address with the country on the town's line, without a stray comma", () => {
    renderCard(courierOrder)

    expect(screen.getByText("Shipping Address")).toBeInTheDocument()
    expect(screen.getByText("ul. Mokotowska 12/4")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa, Poland")).toBeInTheDocument()
    expect(screen.queryByText("PL")).not.toBeInTheDocument()
  })

  it("names the courier and its delivery method", () => {
    renderCard(buildAdminOrderDetail({ delivery: { ...COURIER_DELIVERY, methodName: "Kurier 24h" } }))

    expect(screen.getByText("InPost — Kurier 24h")).toBeInTheDocument()
  })

  it("shows the tracking number with a tracking link", () => {
    renderCard(courierOrder)

    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open tracking page" })).toHaveAttribute(
      "href",
      "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012",
    )
  })

  it("states when no address was captured", () => {
    renderCard(
      buildAdminOrderDetail({ delivery: undefined, shippingAddress: undefined, trackingNumber: undefined, trackingUrl: undefined }),
    )

    expect(screen.getByText("No shipping address recorded.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copy shipping address" })).not.toBeInTheDocument()
  })

  it("omits the tracking row until a parcel is registered", () => {
    renderCard(buildAdminOrderDetail({ delivery: COURIER_DELIVERY, trackingNumber: undefined, trackingUrl: undefined }))

    expect(screen.queryByText("00259007123456789012")).not.toBeInTheDocument()
  })

  it("names the delivery method alone when the courier is unknown", () => {
    renderCard(
      buildAdminOrderDetail({ delivery: { ...COURIER_DELIVERY, courierName: undefined, methodName: "Odbiór osobisty", type: "in_store" } }),
    )

    expect(screen.getByText("Odbiór osobisty")).toHaveTextContent(/^Odbiór osobisty$/u)
    expect(screen.queryByText("WAW01A")).toBeNull()
  })

  it("shows the tracking number without a link when no tracking page is known", () => {
    renderCard(buildAdminOrderDetail({ delivery: COURIER_DELIVERY, trackingUrl: undefined }))

    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Open tracking page" })).toBeNull()
  })

  it("separates the address from a tracking number even without a delivery method", () => {
    const { container } = renderCard(buildAdminOrderDetail({ delivery: undefined }))

    expect(container.querySelector("[data-slot='separator']")).not.toBeNull()
    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
  })

  it("draws no separator when there is neither a delivery method nor a tracking number", () => {
    const { container } = renderCard(buildAdminOrderDetail({ delivery: undefined, trackingNumber: undefined, trackingUrl: undefined }))

    expect(container.querySelector("[data-slot='separator']")).toBeNull()
  })
})

describe("OrderShippingCard copy", () => {
  it("copies the address as the label lines a parcel needs and confirms it", async () => {
    renderCard(
      buildAdminOrderDetail({
        delivery: COURIER_DELIVERY,
        shippingAddress: { ...SHIPPING_ADDRESS, line2: "lok. 4", province: "mazowieckie" },
      }),
    )

    await userEvent.click(screen.getByRole("button", { name: "Copy shipping address" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(
      ["Anna Kowalska", "ul. Mokotowska 12/4", "lok. 4", "00-640 Warszawa, mazowieckie, Poland", "+48 600 123 456"].join("\n"),
    )
    expect(spies.toastSuccess).toHaveBeenCalledExactlyOnceWith("Shipping address copied")
  })

  it("copies the town alone when no postal code or phone was captured", async () => {
    renderCard(
      buildAdminOrderDetail({
        delivery: COURIER_DELIVERY,
        shippingAddress: { ...SHIPPING_ADDRESS, phone: undefined, postalCode: undefined },
      }),
    )

    await userEvent.click(screen.getByRole("button", { name: "Copy shipping address" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(["Anna Kowalska", "ul. Mokotowska 12/4", "Warszawa, Poland"].join("\n"))
  })
})

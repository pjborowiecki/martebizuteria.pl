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

const order = buildAdminOrderDetail()

const renderCard = (detail = order) =>
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

describe("OrderShippingCard", () => {
  it("prints the recipient address", () => {
    renderCard()

    expect(screen.getByText("Shipping Address")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("ul. Mokotowska 12/4")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa")).toBeInTheDocument()
  })

  it("names the courier and its delivery method", () => {
    renderCard()

    expect(screen.getByText("InPost — Paczkomat 24/7")).toBeInTheDocument()
  })

  it("shows the locker and tracking number with a tracking link", () => {
    renderCard()

    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open tracking page" })).toHaveAttribute("href", order.trackingUrl ?? "")
  })

  it("states when no address was captured", () => {
    renderCard(
      buildAdminOrderDetail({ delivery: undefined, shippingAddress: undefined, trackingNumber: undefined, trackingUrl: undefined }),
    )

    expect(screen.getByText("No shipping address recorded.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copy shipping address" })).not.toBeInTheDocument()
  })

  it("omits the tracking row until a parcel is registered", () => {
    renderCard(buildAdminOrderDetail({ trackingNumber: undefined, trackingUrl: undefined }))

    expect(screen.queryByText("00259007123456789012")).not.toBeInTheDocument()
  })
})

describe("OrderShippingCard copy", () => {
  it("copies the address as the label lines a parcel needs and confirms it", async () => {
    renderCard(buildAdminOrderDetail({ shippingAddress: { ...SHIPPING_ADDRESS, line2: "lok. 4", province: "mazowieckie" } }))

    await userEvent.click(screen.getByRole("button", { name: "Copy shipping address" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(
      ["Anna Kowalska", "ul. Mokotowska 12/4", "lok. 4", "00-640 Warszawa", "mazowieckie", "PL", "+48 600 123 456"].join("\n"),
    )
    expect(spies.toastSuccess).toHaveBeenCalledExactlyOnceWith("Shipping address copied")
  })

  it("leaves the lines an address does not have out of the copy", async () => {
    renderCard(buildAdminOrderDetail({ shippingAddress: { ...SHIPPING_ADDRESS, line2: "  ", phone: undefined, postalCode: "" } }))

    await userEvent.click(screen.getByRole("button", { name: "Copy shipping address" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(["Anna Kowalska", "ul. Mokotowska 12/4", "Warszawa", "PL"].join("\n"))
  })

  it("copies the city alone when no postal code was captured", async () => {
    renderCard(buildAdminOrderDetail({ shippingAddress: { ...SHIPPING_ADDRESS, phone: undefined, postalCode: undefined } }))

    await userEvent.click(screen.getByRole("button", { name: "Copy shipping address" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith(["Anna Kowalska", "ul. Mokotowska 12/4", "Warszawa", "PL"].join("\n"))
  })
})

describe("OrderShippingCard delivery", () => {
  it("names the delivery method alone when the courier is unknown", () => {
    renderCard(
      buildAdminOrderDetail({ delivery: { courierName: undefined, lockerId: undefined, methodName: "Odbiór osobisty", type: "in_store" } }),
    )

    expect(screen.getByText("Odbiór osobisty")).toHaveTextContent(/^Odbiór osobisty$/u)
    expect(screen.queryByText("WAW01A")).toBeNull()
  })

  it("shows the tracking number without a link when no tracking page is known", () => {
    renderCard(buildAdminOrderDetail({ trackingUrl: undefined }))

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

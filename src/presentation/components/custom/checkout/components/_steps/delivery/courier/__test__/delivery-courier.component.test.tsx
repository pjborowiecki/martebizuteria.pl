import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface DeliveryMethodRow {
  readonly id: string
  readonly name: string
  readonly price: number
  readonly type: string
}

const methods = vi.hoisted(() => {
  const rows: { current: DeliveryMethodRow[] } = { current: [] }

  return { rows }
})

const pricing = vi.hoisted(() => ({ free: false }))

vi.mock("~/src/presentation/components/custom/checkout/hooks/use-checkout-delivery-pricing", () => ({
  useCheckoutDeliveryPricing: () => ({ priceOf: (price: number) => (pricing.free ? 0 : price) }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({
  listDeliveryMethodsQuery: () => ({ queryFn: () => Promise.resolve(methods.rows.current), queryKey: ["deliveryMethods"] }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", async () => {
  const { useForm } = await import("react-hook-form")

  return {
    useCheckoutForm: () => {
      const { control } = useForm({ defaultValues: { deliveryMethod: "", deliveryNotes: "" } })

      return { control }
    },
  }
})

import { DeliveryCourier } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/courier/delivery-courier"

const COURIER_TITLE = "Choose a courier"

const PARCEL_DELIVERY_TIME =
  "We prepare your order within the fulfillment time stated on the product page, counted from the acceptance of the order; with several products, the longest applies. InPost delivery then takes up to 4 business days from dispatch, and we email you the tracking number."

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  pricing.free = false
  methods.rows.current = [
    { id: "dhl", name: "DHL Express", price: 1999, type: "courier" },
    { id: "inpost-locker", name: "InPost Locker", price: 1299, type: "locker" },
  ]
})

describe("DeliveryCourier", () => {
  it("renders the courier options once the methods load", async () => {
    renderWithProviders(<DeliveryCourier />)

    expect(await screen.findByText(COURIER_TITLE)).toBeInTheDocument()
    expect(screen.getByText("DHL Express")).toBeInTheDocument()
  })

  it("leaves out delivery methods that are not couriers", async () => {
    renderWithProviders(<DeliveryCourier />)
    await screen.findByText(COURIER_TITLE)

    expect(screen.queryByText("InPost Locker")).not.toBeInTheDocument()
  })

  it("renders the courier price converted from minor units", async () => {
    renderWithProviders(<DeliveryCourier />)
    await screen.findByText(COURIER_TITLE)

    expect(screen.getByText("PLN 19.99")).toBeInTheDocument()
  })

  it("names a courier free once the basket earns free delivery", async () => {
    pricing.free = true

    renderWithProviders(<DeliveryCourier />)
    await screen.findByText(COURIER_TITLE)

    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.queryByText("PLN 19.99")).not.toBeInTheDocument()
  })

  it("renders nothing while the methods are still loading", () => {
    const { container } = renderWithProviders(<DeliveryCourier />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when no courier is offered", async () => {
    methods.rows.current = [{ id: "inpost-locker", name: "InPost Locker", price: 1299, type: "locker" }]

    const { container } = renderWithProviders(<DeliveryCourier />)
    await Promise.resolve()

    expect(container).toBeEmptyDOMElement()
  })

  it("offers a delivery notes field alongside the couriers", async () => {
    renderWithProviders(<DeliveryCourier />)
    await screen.findByText(COURIER_TITLE)

    expect(screen.getByLabelText("Delivery Instructions (Optional)")).toBeInTheDocument()
  })

  it("states the delivery time the terms of service give: the fulfillment time, then up to 4 business days with InPost", async () => {
    renderWithProviders(<DeliveryCourier />)

    expect(await screen.findByText(PARCEL_DELIVERY_TIME)).toBeInTheDocument()
  })

  it("gives each courier option its own radio input", async () => {
    methods.rows.current = [
      { id: "dhl", name: "DHL Express", price: 1999, type: "courier" },
      { id: "ups", name: "UPS Standard", price: 2499, type: "courier" },
    ]
    renderWithProviders(<DeliveryCourier />)
    await screen.findByText(COURIER_TITLE)

    expect(screen.getAllByRole("radio")).toHaveLength(2)
  })
})

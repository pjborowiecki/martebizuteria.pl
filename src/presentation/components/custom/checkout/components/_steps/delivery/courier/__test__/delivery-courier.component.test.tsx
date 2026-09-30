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

afterEach(() => {
  cleanup()
})

beforeEach(() => {
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

  it("explains the standard delivery window", async () => {
    renderWithProviders(<DeliveryCourier />)

    expect(
      await screen.findByText(
        "Standard delivery typically takes 1-3 business days. You will receive a tracking link once your order has shipped.",
      ),
    ).toBeInTheDocument()
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

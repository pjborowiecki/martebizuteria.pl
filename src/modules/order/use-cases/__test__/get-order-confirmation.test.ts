import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getOrderConfirmation } from "../get-order-confirmation"

interface AddressRow {
  readonly address1: string
  readonly address2: string | null
  readonly city: string
  readonly countryCode: string
  readonly firstName: string
  readonly lastName: string
  readonly phone: string | null
  readonly postalCode: string
  readonly province: string | null
}

const placedAddress: AddressRow = {
  address1: "ul. Wąska 11",
  address2: null,
  city: "Bochnia",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "32-700",
  province: null,
}

const editedAddress: AddressRow = { ...placedAddress, address1: "ul. Nowa 5", city: "Kraków", postalCode: "30-001" }

const order = vi.hoisted(() => ({ addresses: [] as readonly ({ type: string } & object)[] }))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: { sessionId: string } }) => unknown) => (options: { data: { sessionId: string } }) =>
        handler(options),
      validator: () => builder,
    }

    return builder
  },
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(null) }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getAdminOrderItemRows: () => Promise.resolve([]),
  getOrderByTransactionId: () =>
    Promise.resolve({
      addresses: order.addresses,
      checkout: { shippingAddress: editedAddress },
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      currencyCode: "PLN",
      deliveryMethod: null,
      discountTotal: 0,
      email: "anna@example.test",
      id: "order-1",
      orderNumber: 1042,
      shippingTotal: 1500,
      subtotal: 12_900,
      taxBasisPoints: 2300,
      taxTotal: 2412,
      total: 14_400,
      userId: null,
    }),
}))

beforeEach(() => {
  order.addresses = []
})

describe("getOrderConfirmation shipping address", () => {
  it("shows the address the order was placed with, even after the customer edits their address book", async () => {
    order.addresses = [{ ...placedAddress, type: "shipping" }]

    const confirmation = await getOrderConfirmation({ data: { sessionId: "cs_test_1" } })

    expect(confirmation?.shippingAddress).toMatchObject({ city: "Bochnia", line1: "ul. Wąska 11" })
  })

  it("falls back to the checkout's address for an order placed before addresses were recorded on orders", async () => {
    const confirmation = await getOrderConfirmation({ data: { sessionId: "cs_test_1" } })

    expect(confirmation?.shippingAddress).toMatchObject({ city: "Kraków", line1: "ul. Nowa 5" })
  })
})

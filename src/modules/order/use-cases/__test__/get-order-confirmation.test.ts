import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { ZodError } from "zod/v4"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

import { getOrderConfirmation, getOrderConfirmationQuery } from "../get-order-confirmation"

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

const order = vi.hoisted(() => ({
  addresses: [] as readonly ({ type: string } & object)[],
  deliveryMethod: null as { name: string } | null,
  exists: true,
  itemRows: [] as readonly object[],
  sessionUserId: undefined as string | undefined,
  transactionIds: [] as string[],
  userId: null as string | null,
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve(order.sessionUserId === undefined ? null : { user: { id: order.sessionUserId } }),
}))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getAdminOrderItemRows: () => Promise.resolve(order.itemRows),
  getOrderByTransactionId: (transactionId: string) => {
    order.transactionIds.push(transactionId)

    return Promise.resolve(
      order.exists
        ? {
            addresses: order.addresses,
            checkout: { shippingAddress: editedAddress },
            createdAt: new Date("2026-10-01T10:00:00.000Z"),
            currencyCode: "PLN",
            deliveryMethod: order.deliveryMethod,
            discountTotal: 0,
            email: "anna@example.test",
            id: "order-1",
            orderNumber: 1042,
            shippingTotal: 1500,
            subtotal: 12_900,
            taxBasisPoints: 2300,
            taxTotal: 2412,
            total: 14_400,
            userId: order.userId,
          }
        : undefined,
    )
  },
}))

beforeEach(() => {
  order.addresses = []
  order.deliveryMethod = null
  order.exists = true
  order.itemRows = []
  order.sessionUserId = undefined
  order.transactionIds = []
  order.userId = null
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

describe("getOrderConfirmation lookup", () => {
  it("looks the order up by the trimmed Checkout Session id", async () => {
    await getOrderConfirmation({ data: { sessionId: "  cs_test_1  " } })

    expect(order.transactionIds).toStrictEqual(["cs_test_1"])
  })

  it("rejects an empty Checkout Session id before reading any order", () => {
    expect(() => {
      void getOrderConfirmation({ data: { sessionId: "   " } })
    }).toThrow(ZodError)
    expect(order.transactionIds).toStrictEqual([])
  })

  it("reports nothing while no order exists for the Checkout Session yet", async () => {
    order.exists = false

    await expect(getOrderConfirmation({ data: { sessionId: "cs_test_1" } })).resolves.toBeUndefined()
  })

  it("carries the totals, the delivery method and the lines of the order", async () => {
    order.deliveryMethod = { name: "Kurier DPD" }
    order.itemRows = [
      {
        id: "item-1",
        productHandle: "aura-hoop",
        quantity: 1,
        sku: null,
        thumbnail: "",
        title: "Aura Hoop",
        total: 12_900,
        unitPrice: 12_900,
        variantTitle: null,
      },
    ]

    const confirmation = await getOrderConfirmation({ data: { sessionId: "cs_test_1" } })

    expect(confirmation).toMatchObject({
      deliveryMethodName: "Kurier DPD",
      discountTotalMinorUnits: 0,
      email: "anna@example.test",
      id: "order-1",
      shippingTotalMinorUnits: 1500,
      subtotalMinorUnits: 12_900,
      taxBasisPoints: 2300,
      taxTotalMinorUnits: 2412,
      totalMinorUnits: 14_400,
    })
    expect(confirmation?.items).toStrictEqual([
      {
        id: "item-1",
        imageUrl: undefined,
        productHandle: "aura-hoop",
        quantity: 1,
        sku: undefined,
        title: "Aura Hoop",
        totalMinorUnits: 12_900,
        unitPriceMinorUnits: 12_900,
        variantTitle: undefined,
      },
    ])
  })
})

describe("getOrderConfirmation ownership", () => {
  it("marks an order placed without an account as a guest order", async () => {
    order.sessionUserId = "user-1"

    await expect(getOrderConfirmation({ data: { sessionId: "cs_test_1" } })).resolves.toMatchObject({
      isGuestOrder: true,
      isOwnOrder: false,
    })
  })

  it("marks an account order as the viewer's own when they are signed in to that account", async () => {
    order.userId = "user-1"
    order.sessionUserId = "user-1"

    await expect(getOrderConfirmation({ data: { sessionId: "cs_test_1" } })).resolves.toMatchObject({
      isGuestOrder: false,
      isOwnOrder: true,
    })
  })

  it("keeps an account order from a viewer signed in to another account", async () => {
    order.userId = "user-1"
    order.sessionUserId = "user-2"

    await expect(getOrderConfirmation({ data: { sessionId: "cs_test_1" } })).resolves.toMatchObject({ isOwnOrder: false })
  })

  it("keeps an account order from a signed out viewer", async () => {
    order.userId = "user-1"

    await expect(getOrderConfirmation({ data: { sessionId: "cs_test_1" } })).resolves.toMatchObject({ isOwnOrder: false })
  })
})

describe("getOrderConfirmationQuery", () => {
  it("keys the confirmation by its Checkout Session id", () => {
    expect(getOrderConfirmationQuery("cs_test_1").queryKey).toStrictEqual([...ORDER_QUERY_KEYS.CONFIRMATION, "cs_test_1"])
  })

  it("waits for a Checkout Session id before fetching", () => {
    expect(getOrderConfirmationQuery("").enabled).toBe(false)
    expect(getOrderConfirmationQuery("cs_test_1").enabled).toBe(true)
  })

  it("keeps retrying while the webhook has not written the order yet", () => {
    expect(getOrderConfirmationQuery("cs_test_1")).toMatchObject({ retry: 5, retryDelay: 1500 })
  })

  it("fetches the confirmation through the server function", async () => {
    await expect(new QueryClient().query(getOrderConfirmationQuery("cs_test_1"))).resolves.toMatchObject({ id: "order-1" })
    expect(order.transactionIds).toStrictEqual(["cs_test_1"])
  })
})

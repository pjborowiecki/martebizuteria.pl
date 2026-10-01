import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerOrder, getCustomerOrderQuery } from "~/src/modules/customer-account/use-cases/get-customer-order"

const CALLER_CONTEXT = { auth: { session: { id: "session-1" }, user: { id: "customer-1" } } }

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const access = vi.hoisted(() => ({
  findFirst: vi.fn(),
  selectWhere: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { order: { findFirst: access.findFirst } },
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({ where: () => ({ orderBy: access.selectWhere }) }),
        }),
      }),
    }),
  },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT; data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ ...options, context: CALLER_CONTEXT }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        validated.parse = validate

        return builder
      },
    }

    return builder
  },
}))

const address = (overrides: Record<string, unknown> = {}) => ({
  address1: "Dluga 1",
  address2: null,
  city: "Krakow",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "30-001",
  province: null,
  ...overrides,
})

const payment = (overrides: Record<string, unknown> = {}) => ({
  provider: "stripe",
  refundedAmount: 0,
  refundedAt: null,
  status: "succeeded",
  updatedAt: new Date("2026-02-01T10:05:00.000Z"),
  ...overrides,
})

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  addresses: [],
  billingCompanyName: null,
  billingNip: null,
  canceledAt: null,
  checkout: { billingAddress: null, shippingAddress: address() },
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currencyCode: "PLN",
  customerNote: null,
  deliveredAt: null,
  deliveryMethod: { courier: { name: "InPost" }, name: "Kurier InPost", type: "courier" },
  discountTotal: 0,
  fulfillmentStatus: "shipped",
  id: "order-1",
  lockerId: null,
  orderNumber: "MRT-2026-00001",
  payment: payment(),
  shippedAt: new Date("2026-02-03T10:00:00.000Z"),
  shippingTotal: 1500,
  status: "paid",
  subtotal: 10_000,
  taxBasisPoints: 2300,
  taxTotal: 500,
  total: 12_000,
  trackingNumber: "PL123",
  trackingUrl: "https://tracking.example.com/PL123",
  ...overrides,
})

const fetchOrder = () => getCustomerOrder({ data: { orderId: "order-1" } })

describe("getCustomerOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("returns nothing and reads no items when the order is not the caller's", async () => {
    access.findFirst.mockResolvedValue(undefined)

    await expect(fetchOrder()).resolves.toBeUndefined()
    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("maps the money columns onto minor unit fields", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.subtotalMinorUnits).toBe(10_000)
    expect(detail?.taxMinorUnits).toBe(500)
    expect(detail?.shippingMinorUnits).toBe(1500)
    expect(detail?.totalMinorUnits).toBe(12_000)
  })

  it("exposes the tracking details and the payment provider", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.trackingNumber).toBe("PL123")
    expect(detail?.trackingUrl).toBe("https://tracking.example.com/PL123")
    expect(detail?.paymentProvider).toBe("stripe")
  })

  it("reports a missing tracking number and payment as absent rather than null", async () => {
    access.findFirst.mockResolvedValue(orderRow({ payment: null, trackingNumber: null, trackingUrl: null }))

    const detail = await fetchOrder()

    expect(detail?.trackingNumber).toBeUndefined()
    expect(detail?.trackingUrl).toBeUndefined()
    expect(detail?.paymentProvider).toBeUndefined()
  })

  it("maps the checkout shipping address and leaves an absent billing address out", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.shippingAddress).toStrictEqual({
      city: "Krakow",
      countryCode: "PL",
      line1: "Dluga 1",
      line2: undefined,
      name: "Anna Kowalska",
      phone: undefined,
      postalCode: "30-001",
      province: undefined,
    })
    expect(detail?.billingAddress).toBeUndefined()
  })

  it("falls back to a placeholder name when the address carries none", async () => {
    access.findFirst.mockResolvedValue(
      orderRow({ checkout: { billingAddress: address({ firstName: null, lastName: null }), shippingAddress: null } }),
    )

    const detail = await fetchOrder()

    expect(detail?.billingAddress?.name).toBe("—")
    expect(detail?.shippingAddress).toBeUndefined()
  })

  it("leaves both addresses out for an order without a checkout", async () => {
    access.findFirst.mockResolvedValue(orderRow({ checkout: null }))

    const detail = await fetchOrder()

    expect(detail?.billingAddress).toBeUndefined()
    expect(detail?.shippingAddress).toBeUndefined()
  })
})

describe("getCustomerOrder timeline and refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("builds the timeline newest first from the order milestones", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.timeline.map((entry) => entry.event)).toStrictEqual(["shipped", "confirmed", "placed"])
  })

  it("dates the confirmation from the payment rather than repeating the placement time", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.timeline.find((entry) => entry.event === "confirmed")?.date).toStrictEqual(new Date("2026-02-01T10:05:00.000Z"))
  })

  it("keeps an unpaid order at the placed milestone alone", async () => {
    access.findFirst.mockResolvedValue(orderRow({ payment: payment({ status: "pending" }), shippedAt: null, status: "pending" }))

    const detail = await fetchOrder()

    expect(detail?.timeline.map((entry) => entry.event)).toStrictEqual(["placed"])
  })

  it("records a refund on the timeline and against the total", async () => {
    const refundedAt = new Date("2026-02-10T10:00:00.000Z")
    const refundedPayment = payment({ refundedAmount: 12_000, refundedAt, status: "refunded" })
    access.findFirst.mockResolvedValue(orderRow({ payment: refundedPayment, status: "refunded" }))

    const detail = await fetchOrder()

    expect(detail?.timeline[0]?.event).toBe("refunded")
    expect(detail?.refund).toStrictEqual({ amountMinorUnits: 12_000, refundedAt })
    expect(detail?.filterStatus).toBe("refunded")
  })

  it("keeps a fully paid order free of refund information", async () => {
    access.findFirst.mockResolvedValue(orderRow())

    const detail = await fetchOrder()

    expect(detail?.refund).toBeUndefined()
  })
})

describe("getCustomerOrder destination and invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("prefers the order's own address snapshot over the editable address book row", async () => {
    access.findFirst.mockResolvedValue(
      orderRow({
        addresses: [{ ...address({ address1: "Snapshot 9", firstName: "Ada", lastName: "Nowak" }), type: "shipping" }],
      }),
    )

    const detail = await fetchOrder()

    expect(detail?.shippingAddress).toMatchObject({ line1: "Snapshot 9", name: "Ada Nowak" })
  })

  it("names the delivery method and hides a locker for a courier order", async () => {
    access.findFirst.mockResolvedValue(orderRow({ lockerId: "WAW01A" }))

    const detail = await fetchOrder()

    expect(detail?.deliveryMethodName).toBe("Kurier InPost")
    expect(detail?.lockerId).toBeUndefined()
  })

  it("shows the parcel locker as the destination of a locker order", async () => {
    access.findFirst.mockResolvedValue(orderRow({ deliveryMethod: { name: "Paczkomat InPost", type: "locker" }, lockerId: "WAW01A" }))

    const detail = await fetchOrder()

    expect(detail?.lockerId).toBe("WAW01A")
  })

  it("carries the invoice details and the customer's note", async () => {
    access.findFirst.mockResolvedValue(
      orderRow({ billingCompanyName: "MARTE sp. z o.o.", billingNip: "1234567890", customerNote: "Gift wrap it" }),
    )

    const detail = await fetchOrder()

    expect(detail).toMatchObject({
      billingCompanyName: "MARTE sp. z o.o.",
      billingNip: "1234567890",
      customerNote: "Gift wrap it",
    })
  })

  it("carries the discount and the VAT rate the order was charged at", async () => {
    access.findFirst.mockResolvedValue(orderRow({ discountTotal: 2000 }))

    const detail = await fetchOrder()

    expect(detail?.discountMinorUnits).toBe(2000)
    expect(detail?.taxBasisPoints).toBe(2300)
  })

  it("records a cancellation on the timeline", async () => {
    access.findFirst.mockResolvedValue(orderRow({ canceledAt: new Date("2026-02-05T10:00:00.000Z"), shippedAt: null, status: "cancelled" }))

    const detail = await fetchOrder()

    expect(detail?.timeline[0]?.event).toBe("cancelled")
    expect(detail?.filterStatus).toBe("cancelled")
  })

  it("maps the order items with their image, variant and unit price", async () => {
    access.findFirst.mockResolvedValue(orderRow())
    access.selectWhere.mockResolvedValue([
      {
        handle: "silver-ring",
        id: "item-1",
        quantity: 2,
        thumbnail: "products/ring.webp",
        title: "Silver ring",
        total: 8000,
        unitPrice: 4000,
        variantTitle: "Size 12",
      },
    ])

    const detail = await fetchOrder()

    expect(detail?.items).toStrictEqual([
      {
        handle: "silver-ring",
        id: "item-1",
        image: "cdn/products/ring.webp",
        lineTotalMinorUnits: 8000,
        name: "Silver ring",
        qty: 2,
        unitPriceMinorUnits: 4000,
        variantTitle: "Size 12",
      },
    ])
  })

  it("leaves the image out for an item without a thumbnail", async () => {
    access.findFirst.mockResolvedValue(orderRow())
    access.selectWhere.mockResolvedValue([
      { handle: null, id: "item-1", quantity: 1, thumbnail: "", title: "Silver ring", total: 8000, unitPrice: 8000, variantTitle: null },
    ])

    const detail = await fetchOrder()

    expect(detail?.items[0]?.image).toBeUndefined()
    expect(detail?.items[0]?.variantTitle).toBeUndefined()
    expect(detail?.items[0]?.handle).toBeUndefined()
  })
})

describe("getCustomerOrder input validation", () => {
  it("requires an order id", () => {
    expect(validated.parse?.({ orderId: "order-1" })).toStrictEqual({ orderId: "order-1" })
    expect(() => validated.parse?.({ orderId: "" })).toThrow()
    expect(() => validated.parse?.({})).toThrow()
  })
})

describe("getCustomerOrderQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("keys the order by its id", () => {
    const options = getCustomerOrderQuery("order-1")

    expect(options.queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.ORDER_BY_ID, "order-1"])
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("asks for the keyed order when the cache runs the query", async () => {
    access.findFirst.mockResolvedValue(orderRow({ id: "order-9" }))

    const detail = await new QueryClient().query(getCustomerOrderQuery("order-9"))

    expect(detail.id).toBe("order-9")
    expect(access.findFirst).toHaveBeenCalledTimes(1)
  })

  it("raises a not found for an order the customer cannot see, rather than resolving nothing", async () => {
    access.findFirst.mockResolvedValue(undefined)

    const caught: { thrown?: unknown } = {}
    try {
      await new QueryClient({ defaultOptions: { queries: { retry: false } } }).query(getCustomerOrderQuery("order-gone"))
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(isNotFound(caught.thrown)).toBe(true)
  })
})

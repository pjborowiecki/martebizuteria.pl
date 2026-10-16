import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { ADMIN_ORDER_DETAIL_TAG, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

import { getAdminOrder, getAdminOrderQuery } from "../get-admin-order"

const CREATED_AT = new Date(1_700_000_000_000)

const accessors = vi.hoisted(() => ({
  getAdminOrderCustomerStats: vi.fn(() => Promise.resolve({ orderCount: 1, totalSpent: 0 })),
  getAdminOrderDetailRow: vi.fn(),
  getAdminOrderItemRows: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
  getAdminOrderTimelineRows: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
  getOrderWithdrawals: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
}))

const shipx = vi.hoisted(() => ({ configured: { current: true } }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/inpost/inpost.shipx.server", () => ({ isInpostShipxConfigured: () => shipx.configured.current }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getAdminOrderCustomerStats: accessors.getAdminOrderCustomerStats,
  getAdminOrderDetailRow: accessors.getAdminOrderDetailRow,
  getAdminOrderItemRows: accessors.getAdminOrderItemRows,
  getAdminOrderTimelineRows: accessors.getAdminOrderTimelineRows,
}))
vi.mock("~/src/modules/order-withdrawal/order-withdrawal.accessors", () => ({ getOrderWithdrawals: accessors.getOrderWithdrawals }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  shipx.configured.current = true
})

const DETAIL_ORDER_ID = "6f1c2a9e-4b7d-4e3a-9c51-2d8f0b7a6e14"

const detailAddress = (overrides: Record<string, unknown> = {}) => ({
  address1: "ul. Dluga 1",
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

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  addresses: [],
  billingCompanyName: null,
  billingNip: null,
  canceledAt: null,
  checkout: {
    billingAddress: detailAddress({ address1: "ul. Firmowa 2" }),
    billingAddressId: "addr-bill",
    shippingAddress: detailAddress(),
    shippingAddressId: "addr-ship",
  },
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerNote: null,
  deliveredAt: null,
  deliveredEmailAt: null,
  deliveryMethod: null,
  discountTotal: 0,
  email: "ada@example.test",
  fulfillmentStartedAt: null,
  fulfillmentStatus: "not_fulfilled",
  id: DETAIL_ORDER_ID,
  inProgressEmailAt: null,
  inpostShipmentId: null,
  inpostShipmentStatus: null,
  lockerId: null,
  lockerUnconfirmed: false,
  metadata: null,
  orderNumber: "MRT-2026-00001",
  payment: null,
  restockedAt: null,
  shippedAt: null,
  shippedEmailAt: null,
  shippingTotal: 1500,
  status: "processing",
  subtotal: 10_000,
  taxBasisPoints: 2300,
  taxTotal: 2100,
  total: 11_500,
  trackingNumber: null,
  trackingUrl: null,
  user: { id: "user-1", name: "Ada Lovelace", phone: null },
  userId: "user-1",
  ...overrides,
})

const fetchAdminOrder = () => getAdminOrder({ data: { orderId: DETAIL_ORDER_ID } })

describe("getAdminOrder addresses", () => {
  it("shows the addresses the order was placed with after the customer edits their address book", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress({ address1: "ul. Snapshot 9", firstName: "Ada", lastName: "Nowak" }), type: "shipping" },
          { ...detailAddress({ address1: "ul. Faktura 3" }), type: "billing" },
        ],
        checkout: {
          billingAddress: detailAddress({ address1: "ul. Edited 1" }),
          billingAddressId: "addr-bill",
          shippingAddress: detailAddress({ address1: "ul. Edited 1" }),
          shippingAddressId: "addr-ship",
        },
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress).toStrictEqual({
      city: "Krakow",
      countryCode: "PL",
      line1: "ul. Snapshot 9",
      line2: undefined,
      name: "Ada Nowak",
      phone: undefined,
      postalCode: "30-001",
      province: undefined,
    })
    expect(detail?.billingAddress?.line1).toBe("ul. Faktura 3")
    expect(detail?.billingSameAsShipping).toBe(false)
  })

  it("keeps the order's addresses and their match after the customer deletes them from their address book", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress({ address1: "ul. Snapshot 9" }), type: "shipping" },
          { ...detailAddress({ address1: "ul. Snapshot 9" }), type: "billing" },
        ],
        checkout: { billingAddress: null, billingAddressId: null, shippingAddress: null, shippingAddressId: null },
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress?.line1).toBe("ul. Snapshot 9")
    expect(detail?.billingAddress?.line1).toBe("ul. Snapshot 9")
    expect(detail?.billingSameAsShipping).toBe(true)
  })

  it("compares the snapshots rather than the checkout's address ids once the order has them", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        addresses: [
          { ...detailAddress(), type: "shipping" },
          { ...detailAddress({ address1: "ul. Faktura 3" }), type: "billing" },
        ],
        checkout: {
          billingAddress: detailAddress({ address1: "ul. Edited 1" }),
          billingAddressId: "addr-ship",
          shippingAddress: detailAddress({ address1: "ul. Edited 1" }),
          shippingAddressId: "addr-ship",
        },
      }),
    )

    await expect(fetchAdminOrder()).resolves.toMatchObject({ billingSameAsShipping: false })
  })

  it("falls back to the checkout's address rows for an order placed before snapshots were written", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress?.line1).toBe("ul. Dluga 1")
    expect(detail?.billingAddress?.line1).toBe("ul. Firmowa 2")
    expect(detail?.billingSameAsShipping).toBe(false)
  })

  it("falls back to the checkout's address ids for an order placed before snapshots were written", async () => {
    const sharedAddress = detailAddress()
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        checkout: {
          billingAddress: sharedAddress,
          billingAddressId: "addr-ship",
          shippingAddress: sharedAddress,
          shippingAddressId: "addr-ship",
        },
      }),
    )

    await expect(fetchAdminOrder()).resolves.toMatchObject({ billingSameAsShipping: true })
  })

  it("leaves both addresses out when neither a snapshot nor a checkout address exists", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ checkout: null }))

    const detail = await fetchAdminOrder()

    expect(detail?.shippingAddress).toBeUndefined()
    expect(detail?.billingAddress).toBeUndefined()
  })
})

describe("getAdminOrder company invoice", () => {
  it("shows the company and NIP the customer asked to be invoiced", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" }),
    )

    await expect(fetchAdminOrder()).resolves.toMatchObject({
      billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
      billingNip: "5260001246",
    })
  })

  it("leaves both out of an order without an invoice request", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    const detail = await fetchAdminOrder()

    expect(detail?.billingCompanyName).toBeUndefined()
    expect(detail?.billingNip).toBeUndefined()
  })
})

describe("getAdminOrder withdrawals", () => {
  it("shows the statements of withdrawal the customer sent for the order", async () => {
    const withdrawal = {
      consumerName: "Ada Lovelace",
      email: "ada@example.test",
      id: "withdrawal-1",
      items: undefined,
      reason: undefined,
      scope: "order",
      submittedAt: CREATED_AT,
    }
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())
    accessors.getOrderWithdrawals.mockResolvedValueOnce([withdrawal])

    await expect(fetchAdminOrder()).resolves.toMatchObject({ withdrawals: [withdrawal] })
    expect(accessors.getOrderWithdrawals).toHaveBeenCalledWith(DETAIL_ORDER_ID)
  })
})

describe("getAdminOrder VAT", () => {
  it("carries the VAT rate and amount the order was taxed at", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ taxBasisPoints: 800, taxTotal: 852 }))

    await expect(fetchAdminOrder()).resolves.toMatchObject({ taxBasisPoints: 800, taxTotalMinorUnits: 852 })
  })
})

const FULFILLMENT_STARTED_AT = new Date(1_700_000_100_000)

const paymentRow = (overrides: Record<string, unknown> = {}) => ({
  amount: 11_500,
  provider: "stripe",
  refundedAmount: 0,
  refundedAt: null,
  status: "succeeded",
  transactionId: "cs_test_1",
  ...overrides,
})

const lockerDelivery = { courier: { name: "InPost" }, names: { "en-US": "Parcel locker 24/7", "pl-PL": "Paczkomat 24/7" }, type: "locker" }

describe("getAdminOrder delivery and payment", () => {
  it("reports nothing for an order that does not exist without reading its lines", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(undefined)

    await expect(fetchAdminOrder()).resolves.toBeUndefined()
    expect(accessors.getAdminOrderItemRows).not.toHaveBeenCalled()
    expect(accessors.getAdminOrderTimelineRows).not.toHaveBeenCalled()
  })

  it("shows the courier, parcel locker and Stripe payment the order was placed with", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ deliveryMethod: lockerDelivery, lockerId: "WAW01A", payment: paymentRow() }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.delivery).toStrictEqual({
      courierName: "InPost",
      lockerId: "WAW01A",
      lockerPoint: undefined,
      lockerUnconfirmed: false,
      methodName: "Parcel locker 24/7",
      type: "locker",
    })
    expect(detail?.payment).toStrictEqual({
      amountMinorUnits: 11_500,
      provider: "stripe",
      refundedAmountMinorUnits: 0,
      refundedAt: undefined,
      status: "succeeded",
      transactionId: "cs_test_1",
    })
    expect(detail?.paymentUiKey).toBe("paid")
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.LOCKER)
    expect(detail?.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.LOCKER_UNCONFIRMED)
  })

  it("flags a parcel locker InPost could not confirm when the order was placed", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ deliveryMethod: lockerDelivery, lockerId: "WAW01A", lockerUnconfirmed: true, payment: paymentRow() }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.delivery).toMatchObject({ lockerId: "WAW01A", lockerUnconfirmed: true })
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.LOCKER_UNCONFIRMED)
  })

  it("dates a partial refund and leaves out a locker and transaction id the order never had", async () => {
    const refundedAt = new Date(1_700_000_200_000)
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({
        deliveryMethod: { ...lockerDelivery, type: "courier" },
        payment: paymentRow({ refundedAmount: 5000, refundedAt, transactionId: null }),
      }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.delivery?.lockerId).toBeUndefined()
    expect(detail?.payment).toMatchObject({ refundedAmountMinorUnits: 5000, refundedAt, transactionId: undefined })
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.PARTIALLY_REFUNDED)
  })

  it("flags a refunded order whose items never went back to stock", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ payment: paymentRow({ status: "refunded" }), status: "refunded" }))

    const detail = await fetchAdminOrder()

    expect(detail?.restockedAt).toBeUndefined()
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  })

  it("dates the return to stock of a refunded order and drops the flag", async () => {
    const restockedAt = new Date(1_700_000_300_000)
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ payment: paymentRow({ status: "refunded" }), restockedAt, status: "refunded" }),
    )

    const detail = await fetchAdminOrder()

    expect(detail?.restockedAt).toBe(restockedAt)
    expect(detail?.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  })
})

describe("getAdminOrder InPost shipment", () => {
  it("reports an order without a shipment and whether the shop can create one", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ deliveryMethod: lockerDelivery, lockerId: "WAW01A" }))

    await expect(fetchAdminOrder()).resolves.toMatchObject({ inpostConfigured: true, inpostShipment: undefined })

    shipx.configured.current = false

    await expect(fetchAdminOrder()).resolves.toMatchObject({ inpostConfigured: false })
  })

  it("shows the shipment InPost created for the order and its last reported status", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ inpostShipmentId: "49", inpostShipmentStatus: "confirmed" }))

    await expect(fetchAdminOrder()).resolves.toMatchObject({ inpostShipment: { id: "49", status: "confirmed" } })
  })

  it("leaves out a status InPost has not reported", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ inpostShipmentId: "49" }))

    await expect(fetchAdminOrder()).resolves.toMatchObject({ inpostShipment: { id: "49", status: undefined } })
  })
})

describe("getAdminOrder customer, lines and timeline", () => {
  it("trims the customer's note and tags the order with it", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ customerNote: "  Please gift wrap.  " }))

    const detail = await fetchAdminOrder()

    expect(detail?.customerNote).toBe("Please gift wrap.")
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.NOTE)
  })

  it("treats a blank note as no note at all", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ customerNote: "   " }))

    const detail = await fetchAdminOrder()

    expect(detail?.customerNote).toBeUndefined()
    expect(detail?.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.NOTE)
  })

  it("reads a guest order without looking up a customer history", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ user: null, userId: null }))

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderCustomerStats).not.toHaveBeenCalled()
    expect(detail?.customer).toMatchObject({ name: "ada@example.test", orderCount: 0, totalSpentMinorUnits: 0, userId: undefined })
    expect(detail?.tags).toContain(ADMIN_ORDER_DETAIL_TAG.GUEST)
  })

  it("reads the customer history of an order placed from an account", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderCustomerStats).toHaveBeenCalledWith("user-1")
    expect(detail?.customer).toMatchObject({ name: "Ada Lovelace", orderCount: 1, userId: "user-1" })
  })

  it("lists the order lines and the timeline the accessors return", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow())
    accessors.getAdminOrderItemRows.mockResolvedValueOnce([
      {
        id: "item-1",
        productHandle: "aura-hoop",
        quantity: 2,
        sku: "AUR-HP-GD",
        thumbnail: "products/aura.jpg",
        title: "Aura Hoop",
        total: 10_000,
        unitPrice: 5000,
        variantTitle: "Gold",
      },
    ])
    accessors.getAdminOrderTimelineRows.mockResolvedValueOnce([
      {
        action: AUDIT_LOG_ACTION.ORDER_PLACED,
        actorName: "System",
        createdAt: CREATED_AT,
        detail: null,
        id: "audit-1",
        severity: "success",
      },
    ])

    const detail = await fetchAdminOrder()

    expect(accessors.getAdminOrderItemRows).toHaveBeenCalledWith(DETAIL_ORDER_ID)
    expect(detail?.items).toStrictEqual([
      {
        id: "item-1",
        imageUrl: "products/aura.jpg",
        productHandle: "aura-hoop",
        quantity: 2,
        sku: "AUR-HP-GD",
        title: "Aura Hoop",
        totalMinorUnits: 10_000,
        unitPriceMinorUnits: 5000,
        variantTitle: "Gold",
      },
    ])
    expect(detail?.timeline.map((event) => event.id)).toStrictEqual(["audit-1"])
  })

  it("dates the processing step from when the order started fulfilment, not from the activity log", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(
      detailRow({ fulfillmentStartedAt: FULFILLMENT_STARTED_AT, fulfillmentStatus: "fulfilled" }),
    )
    accessors.getAdminOrderTimelineRows.mockResolvedValueOnce([
      {
        action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
        actorName: "Admin",
        createdAt: CREATED_AT,
        detail: null,
        id: "audit-2",
        severity: "info",
      },
    ])

    const detail = await fetchAdminOrder()

    expect(detail?.fulfillmentSteps.find((step) => step.key === "processing")).toStrictEqual({
      at: FULFILLMENT_STARTED_AT,
      done: true,
      key: "processing",
    })
  })
})

describe("getAdminOrderQuery", () => {
  it("keys the detail query by the order id", () => {
    expect(getAdminOrderQuery(DETAIL_ORDER_ID).queryKey).toStrictEqual([...ORDER_QUERY_KEYS.ADMIN.ORDER_BY_ID, DETAIL_ORDER_ID])
  })

  it("keeps the cached order out of a refetch on mount or focus", () => {
    const options = getAdminOrderQuery(DETAIL_ORDER_ID)

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("loads the order through the server function, with the step e-mails the customer already received", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(detailRow({ inProgressEmailAt: CREATED_AT }))

    await expect(new QueryClient().query(getAdminOrderQuery(DETAIL_ORDER_ID))).resolves.toMatchObject({
      displayId: "MRT-2026-00001",
      emailedSteps: ["processing"],
      id: DETAIL_ORDER_ID,
    })
  })

  it("sends a missing order to the route's not found boundary", async () => {
    accessors.getAdminOrderDetailRow.mockResolvedValue(undefined)

    await expect(new QueryClient().query(getAdminOrderQuery(DETAIL_ORDER_ID))).rejects.toSatisfy(isNotFound)
  })
})

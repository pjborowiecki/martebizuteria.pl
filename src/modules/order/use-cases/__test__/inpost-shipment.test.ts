import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const database = vi.hoisted(() => {
  const updates: Record<string, unknown>[] = []

  return {
    claimed: { current: true },
    conditions: [] as unknown[],
    set: vi.fn((values: Record<string, unknown>) => {
      updates.push(values)

      return {
        where: (condition: unknown) => {
          database.conditions.push(condition)

          return {
            returning: () => Promise.resolve(database.claimed.current ? [{ id: "0192f3a4-5b6c-7d8e-9fab-cdef01234567" }] : []),
          }
        },
      }
    }),
    updates,
  }
})

const shipx = vi.hoisted(() => ({
  fetchShipxLabelPdfBase64: vi.fn<(shipmentId: string) => Promise<string>>(),
  postShipxShipment: vi.fn(),
}))

const orders = vi.hoisted(() => ({
  getAdminOrderDetailRow: vi.fn(),
  requireOrderInpostShipment: vi.fn(),
  syncOrderInpostShipment: vi.fn<(orderId: string, shipmentId: string) => Promise<void>>(),
}))

const audit = vi.hoisted(() => ({ shipmentCreated: vi.fn() }))

const announcement = vi.hoisted(() => ({ announceOrderShipment: vi.fn<(orderId: string, origin: string) => Promise<unknown>>() }))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("http://127.0.0.1:3000/_serverFn/refresh-inpost-shipment"),
}))
vi.mock("~/src/modules/order/use-cases/announce-order-shipment.server", () => announcement)
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { update: () => ({ set: database.set }) } }))
vi.mock("~/src/integrations/inpost/inpost.shipx.server", () => ({
  fetchShipxLabelPdfBase64: shipx.fetchShipxLabelPdfBase64,
  postShipxShipment: shipx.postShipxShipment,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderShipmentCreatedAudit: audit.shipmentCreated }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getAdminOrderDetailRow: orders.getAdminOrderDetailRow }))
vi.mock(import("~/src/modules/order/order.shipment.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  requireOrderInpostShipment: orders.requireOrderInpostShipment,
  syncOrderInpostShipment: orders.syncOrderInpostShipment,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
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

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"

import { createInpostShipment, createInpostShipmentMutation } from "../create-inpost-shipment"
import { getInpostShipmentLabel, getInpostShipmentLabelMutation } from "../get-inpost-shipment-label"
import { refreshInpostShipment, refreshInpostShipmentMutation } from "../refresh-inpost-shipment"

const shippingSnapshot = {
  address1: "ul. Krucza 1/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48 501 234 567",
  postalCode: "00-001",
  province: null,
  type: "shipping",
}

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  addresses: [shippingSnapshot],
  checkout: null,
  deliveryMethod: { courier: { name: "InPost" }, name: "Paczkomat InPost", type: "locker" },
  email: "anna@example.test",
  fulfillmentStatus: "fulfilled",
  inpostShipmentId: null,
  inpostShipmentStatus: null,
  lockerId: "KRA012",
  orderNumber: "MRT-2026-00012",
  status: "processing",
  ...overrides,
})

const createLockerShipment = () => createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "small" } })

const INVALID_STATE = new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)

const TRACKING_NUMBER = "602677217131630339938736"

const renderedSql = (fragment: unknown): { readonly params: unknown[]; readonly sql: string } => {
  if (!(fragment instanceof SQL)) {
    throw new TypeError("Expected a SQL fragment")
  }

  const { params, sql } = new SQLiteSyncDialect().sqlToQuery(fragment)

  return { params, sql }
}

beforeEach(() => {
  vi.clearAllMocks()
  database.updates.length = 0
  database.conditions.length = 0
  database.claimed.current = true
  orders.getAdminOrderDetailRow.mockResolvedValue(orderRow())
  shipx.postShipxShipment.mockResolvedValue({ id: 49, status: "created", tracking_number: undefined })
})

describe("createInpostShipment", () => {
  it("books a locker parcel for the customer the order ships to and keeps the shipment on the order", async () => {
    await expect(createLockerShipment()).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(shipx.postShipxShipment).toHaveBeenCalledExactlyOnceWith({
      destination: { lockerId: "KRA012", type: "locker" },
      email: "anna@example.test",
      firstName: "Anna",
      lastName: "Kowalska",
      parcel: { template: "small", weightKg: undefined },
      phone: "+48 501 234 567",
      reference: "MRT-2026-00012",
    })
    expect(database.updates[0]).toMatchObject({ inpostShipmentId: "49", inpostShipmentStatus: "created" })
    expect(audit.shipmentCreated).toHaveBeenCalledWith(ORDER_ID, { detail: "49" })
  })

  it("writes the shipment only while the order holds no live shipment and has not shipped", async () => {
    await createLockerShipment()

    expect(renderedSql(database.conditions[0])).toStrictEqual({
      params: [ORDER_ID, "canceled", "shipped", "delivered"],
      sql: '("order"."id" = ? and ("order"."inpost_shipment_id" is null or "order"."inpost_shipment_status" = ?) and "order"."fulfillment_status" not in (?, ?))',
    })
  })

  it("books a new shipment in place of one InPost cancelled and drops the cancelled one's tracking number", async () => {
    orders.getAdminOrderDetailRow.mockResolvedValue(orderRow({ inpostShipmentId: "48", inpostShipmentStatus: "canceled" }))

    await expect(createLockerShipment()).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(shipx.postShipxShipment).toHaveBeenCalledOnce()
    expect(database.updates[0]).toMatchObject({ inpostShipmentId: "49", inpostShipmentStatus: "created" })
    expect(renderedSql(database.updates[0]?.["trackingNumber"]).sql).toBe("null")
    expect(renderedSql(database.updates[0]?.["trackingUrl"]).sql).toBe("null")
    expect(audit.shipmentCreated).toHaveBeenCalledWith(ORDER_ID, { detail: "49" })
  })

  it("books a courier parcel at the shipping address with the weight the admin entered", async () => {
    orders.getAdminOrderDetailRow.mockResolvedValue(
      orderRow({
        addresses: [{ ...shippingSnapshot, address2: "klatka B", firstName: null, lastName: null, phone: null, postalCode: null }],
        deliveryMethod: { courier: { name: "InPost" }, name: "Kurier InPost", type: "courier" },
        lockerId: null,
        status: "pending",
      }),
    )

    await createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "large", weightKg: 1.2 } })

    expect(shipx.postShipxShipment).toHaveBeenCalledWith({
      destination: {
        address: { city: "Warszawa", countryCode: "PL", line1: "ul. Krucza 1/4", line2: "klatka B", postalCode: undefined },
        type: "courier",
      },
      email: "anna@example.test",
      firstName: undefined,
      lastName: undefined,
      parcel: { template: "large", weightKg: 1.2 },
      phone: undefined,
      reference: "MRT-2026-00012",
    })
  })

  it("sends a courier address without the second line it does not have", async () => {
    orders.getAdminOrderDetailRow.mockResolvedValue(
      orderRow({ deliveryMethod: { courier: { name: "InPost" }, name: "Kurier InPost", type: "courier" }, lockerId: null }),
    )

    await createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "small", weightKg: 0.2 } })

    expect(shipx.postShipxShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: {
          address: { city: "Warszawa", countryCode: "PL", line1: "ul. Krucza 1/4", line2: undefined, postalCode: "00-001" },
          type: "courier",
        },
      }),
    )
  })

  it("keeps the tracking number when InPost assigns it straight away", async () => {
    shipx.postShipxShipment.mockResolvedValue({ id: 49, status: "confirmed", tracking_number: TRACKING_NUMBER })

    await createLockerShipment()

    expect(database.updates[0]).toMatchObject({
      trackingNumber: TRACKING_NUMBER,
      trackingUrl: `https://inpost.pl/sledzenie-przesylek?number=${TRACKING_NUMBER}`,
    })
  })

  it("reports an order that does not exist", async () => {
    orders.getAdminOrderDetailRow.mockResolvedValue(undefined)

    await expect(createLockerShipment()).rejects.toThrow(new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND))
    expect(shipx.postShipxShipment).not.toHaveBeenCalled()
  })

  it.each([
    ["an order that already has a shipment", { inpostShipmentId: "48" }],
    ["an order whose shipment InPost confirmed", { inpostShipmentId: "48", inpostShipmentStatus: "confirmed" }],
    [
      "a shipped order whose shipment was cancelled",
      { fulfillmentStatus: "shipped", inpostShipmentId: "48", inpostShipmentStatus: "canceled" },
    ],
    ["an in-store pickup", { deliveryMethod: { courier: { name: "M'ARTE Atelier" }, name: "Odbiór w atelier", type: "in_store" } }],
    ["an order without a delivery method", { deliveryMethod: null }],
    ["a shipped order", { fulfillmentStatus: "shipped" }],
    ["a cancelled order", { status: "cancelled" }],
    ["a locker order without a locker", { lockerId: null }],
    ["an order without a shipping address", { addresses: [] }],
  ])("books nothing with InPost for %s", async (_label, overrides) => {
    orders.getAdminOrderDetailRow.mockResolvedValue(orderRow(overrides))

    await expect(createLockerShipment()).rejects.toThrow(INVALID_STATE)
    expect(shipx.postShipxShipment).not.toHaveBeenCalled()
    expect(database.updates).toHaveLength(0)
  })

  it("leaves the order alone when InPost refuses the shipment", async () => {
    shipx.postShipxShipment.mockRejectedValue(new AppError(ERROR_CODES.VALIDATION, "INPOST_REQUEST_REFUSED"))

    await expect(createLockerShipment()).rejects.toThrow(AppError)
    expect(database.updates).toHaveLength(0)
    expect(audit.shipmentCreated).not.toHaveBeenCalled()
  })

  it("names the extra shipment to cancel when the order shipped or got another shipment while it was booked", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    database.claimed.current = false

    await expect(createLockerShipment()).rejects.toThrow(INVALID_STATE)

    expect(log).toHaveBeenCalledWith(
      `[InPost] Order ${ORDER_ID} shipped or got another shipment while ShipX shipment 49 was booked; cancel it in InPost Manager`,
    )
    expect(audit.shipmentCreated).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it("is keyed by the shared create-shipment key and books the shipment it is handed", async () => {
    expect(createInpostShipmentMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.CREATE_INPOST_SHIPMENT)
    await expect(
      new MutationObserver(new QueryClient(), createInpostShipmentMutation).mutate({ orderId: ORDER_ID, parcelTemplate: "medium" }),
    ).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
  })
})

describe("refreshInpostShipment", () => {
  beforeEach(() => {
    orders.requireOrderInpostShipment.mockResolvedValue({ orderNumber: "MRT-2026-00012", shipmentId: "49" })
    orders.syncOrderInpostShipment.mockResolvedValue()
    announcement.announceOrderShipment.mockResolvedValue({ kind: "order-tracking", status: "sent" })
  })

  it("reads the order's shipment back from InPost", async () => {
    await expect(refreshInpostShipment({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(orders.syncOrderInpostShipment).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "49")
  })

  it("tells the customer a tracking number the refresh brought in, on the shop the admin works in", async () => {
    await refreshInpostShipment({ data: { orderId: ORDER_ID } })

    expect(announcement.announceOrderShipment).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("refreshes nothing for an order without a shipment", async () => {
    orders.requireOrderInpostShipment.mockRejectedValue(INVALID_STATE)

    await expect(refreshInpostShipment({ data: { orderId: ORDER_ID } })).rejects.toThrow(INVALID_STATE)
    expect(orders.syncOrderInpostShipment).not.toHaveBeenCalled()
    expect(announcement.announceOrderShipment).not.toHaveBeenCalled()
  })

  it("is keyed by the shared refresh key and refreshes the order it is handed", async () => {
    expect(refreshInpostShipmentMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.REFRESH_INPOST_SHIPMENT)
    await expect(
      new MutationObserver(new QueryClient(), refreshInpostShipmentMutation).mutate({ orderId: ORDER_ID }),
    ).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
  })
})

describe("getInpostShipmentLabel", () => {
  beforeEach(() => {
    orders.requireOrderInpostShipment.mockResolvedValue({ orderNumber: "MRT-2026-00012", shipmentId: "49" })
    shipx.fetchShipxLabelPdfBase64.mockResolvedValue("JVBERi0xLjQ=")
  })

  it("hands the admin the shipment's PDF label named after the order", async () => {
    await expect(getInpostShipmentLabel({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      content: "JVBERi0xLjQ=",
      fileName: "MRT-2026-00012-inpost.pdf",
    })
    expect(shipx.fetchShipxLabelPdfBase64).toHaveBeenCalledWith("49")
  })

  it("is keyed by the shared label key and fetches the label of the order it is handed", async () => {
    expect(getInpostShipmentLabelMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.DOWNLOAD_INPOST_LABEL)
    await expect(
      new MutationObserver(new QueryClient(), getInpostShipmentLabelMutation).mutate({ orderId: ORDER_ID }),
    ).resolves.toMatchObject({
      fileName: "MRT-2026-00012-inpost.pdf",
    })
  })
})

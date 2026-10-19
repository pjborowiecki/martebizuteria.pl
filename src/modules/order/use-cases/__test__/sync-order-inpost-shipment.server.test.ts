import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const database = vi.hoisted(() => {
  const updates: { readonly values: Record<string, unknown>; readonly where: unknown }[] = []

  return {
    batch: vi.fn((statements: readonly unknown[]) => Promise.resolve(statements)),
    set: vi.fn((values: Record<string, unknown>) => ({
      where: (where: unknown) => {
        const update = { values, where }
        updates.push(update)

        return update
      },
    })),
    updates,
  }
})

const shipx = vi.hoisted(() => ({ fetchShipxShipment: vi.fn() }))

const accessors = vi.hoisted(() => ({ getOrderInpostShipment: vi.fn() }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { batch: database.batch, update: () => ({ set: database.set }) },
}))
vi.mock(import("~/src/integrations/inpost/inpost.shipx.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchShipxShipment: shipx.fetchShipxShipment,
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderInpostShipment: accessors.getOrderInpostShipment }))
vi.mock("cloudflare:workers", () => ({ env: {} }))

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import {
  bookedInpostShipmentColumns,
  requireOrderInpostShipment,
  syncOrderInpostShipment,
} from "~/src/modules/order/use-cases/sync-order-inpost-shipment.server"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const TRACKING_NUMBER = "602677217131630339938736"

const TRACKING_URL = `https://inpost.pl/sledzenie-przesylek?number=${TRACKING_NUMBER}`

const HOLDS_SHIPMENT = '("order"."id" = ? and "order"."inpost_shipment_id" = ?)'

const rendered = (fragment: unknown): { readonly params: unknown[]; readonly sql: string } => {
  if (!(fragment instanceof SQL)) {
    throw new TypeError("Expected a SQL fragment")
  }

  const { params, sql } = new SQLiteSyncDialect().sqlToQuery(fragment)

  return { params, sql }
}

const clearedTracking = (values: Record<string, unknown> | undefined) => ({
  trackingNumber: rendered(values?.["trackingNumber"]).sql,
  trackingUrl: rendered(values?.["trackingUrl"]).sql,
})

beforeEach(() => {
  vi.clearAllMocks()
  database.updates.length = 0
})

describe("bookedInpostShipmentColumns", () => {
  it("records the status InPost reports and the tracking number with its InPost link", () => {
    expect(bookedInpostShipmentColumns({ id: 49, status: "confirmed", tracking_number: TRACKING_NUMBER })).toStrictEqual({
      inpostShipmentStatus: "confirmed",
      trackingNumber: TRACKING_NUMBER,
      trackingUrl: TRACKING_URL,
    })
  })

  it("clears tracking details a replaced shipment left until InPost assigns the new number", () => {
    const columns = bookedInpostShipmentColumns({ id: 49, status: "created", tracking_number: undefined })

    expect(columns.inpostShipmentStatus).toBe("created")
    expect(clearedTracking(columns)).toStrictEqual({ trackingNumber: "null", trackingUrl: "null" })
  })
})

describe("requireOrderInpostShipment", () => {
  it("returns the order's shipment id and order number", async () => {
    accessors.getOrderInpostShipment.mockResolvedValue({ inpostShipmentId: "49", orderNumber: "MRT-2026-00012" })

    await expect(requireOrderInpostShipment(ORDER_ID)).resolves.toStrictEqual({ orderNumber: "MRT-2026-00012", shipmentId: "49" })
  })

  it("reports an order that does not exist", async () => {
    accessors.getOrderInpostShipment.mockResolvedValue(undefined)

    await expect(requireOrderInpostShipment(ORDER_ID)).rejects.toThrow(new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND))
  })

  it("reports an order that has no InPost shipment yet", async () => {
    accessors.getOrderInpostShipment.mockResolvedValue({ inpostShipmentId: null, orderNumber: "MRT-2026-00012" })

    await expect(requireOrderInpostShipment(ORDER_ID)).rejects.toThrow(new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE))
  })
})

describe("syncOrderInpostShipment", () => {
  it("writes the status InPost reports onto the order that holds the shipment", async () => {
    shipx.fetchShipxShipment.mockResolvedValue({ id: 49, status: "created", tracking_number: undefined })

    await syncOrderInpostShipment(ORDER_ID, "49")

    expect(shipx.fetchShipxShipment).toHaveBeenCalledWith("49")
    expect(database.updates).toHaveLength(1)
    expect(database.updates[0]?.values).toMatchObject({ inpostShipmentStatus: "created" })
    expect(database.updates[0]?.values["updatedAt"]).toBeInstanceOf(Date)
    expect(database.updates[0]?.values).not.toHaveProperty("trackingNumber")
    expect(rendered(database.updates[0]?.where)).toStrictEqual({ params: [ORDER_ID, "49"], sql: HOLDS_SHIPMENT })
    expect(database.batch).not.toHaveBeenCalled()
  })

  it("fills in the tracking number and its InPost link only while the order has no tracking details", async () => {
    shipx.fetchShipxShipment.mockResolvedValue({ id: 49, status: "ready_to_pickup", tracking_number: TRACKING_NUMBER })

    await syncOrderInpostShipment(ORDER_ID, "49")

    expect(database.updates[0]?.values).toMatchObject({ inpostShipmentStatus: "ready_to_pickup" })
    expect(database.updates[1]?.values).toStrictEqual({ trackingNumber: TRACKING_NUMBER, trackingUrl: TRACKING_URL })
    expect(rendered(database.updates[1]?.where)).toStrictEqual({
      params: [ORDER_ID, "49"],
      sql: `(${HOLDS_SHIPMENT} and "order"."tracking_number" is null and "order"."tracking_url" is null)`,
    })
    expect(database.batch).toHaveBeenCalledExactlyOnceWith([database.updates[0], database.updates[1]])
  })

  it("takes a cancelled shipment's tracking number off the order and never writes it back", async () => {
    shipx.fetchShipxShipment.mockResolvedValue({ id: 49, status: "canceled", tracking_number: TRACKING_NUMBER })

    await syncOrderInpostShipment(ORDER_ID, "49")

    expect(database.updates[0]?.values).toMatchObject({ inpostShipmentStatus: "canceled" })
    expect(clearedTracking(database.updates[1]?.values)).toStrictEqual({ trackingNumber: "null", trackingUrl: "null" })
    expect(rendered(database.updates[1]?.where)).toStrictEqual({
      params: [ORDER_ID, "49", TRACKING_NUMBER],
      sql: `(${HOLDS_SHIPMENT} and "order"."tracking_number" = ?)`,
    })
    expect(database.batch).toHaveBeenCalledExactlyOnceWith([database.updates[0], database.updates[1]])
  })

  it("leaves the order untouched when InPost cannot be read", async () => {
    shipx.fetchShipxShipment.mockRejectedValue(new AppError(ERROR_CODES.INTERNAL_ERROR, "INPOST_UNAVAILABLE"))

    await expect(syncOrderInpostShipment(ORDER_ID, "49")).rejects.toThrow(AppError)
    expect(database.updates).toHaveLength(0)
    expect(database.batch).not.toHaveBeenCalled()
  })
})

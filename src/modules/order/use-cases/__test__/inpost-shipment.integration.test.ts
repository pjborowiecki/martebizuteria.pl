import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import {
  SHIPX_SHIPMENT_ID,
  SHIPX_TRACKING_NUMBER,
  shipxCanceledShipment,
  shipxConfirmedShipment,
  shipxCreatedShipment,
} from "~/src/integrations/inpost/__test__/fixtures/shipx"
import { type InpostShipment, inpostShipmentSchema } from "~/src/integrations/inpost/inpost.zod"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { createInpostShipment } from "~/src/modules/order/use-cases/create-inpost-shipment"
import { refreshInpostShipment } from "~/src/modules/order/use-cases/refresh-inpost-shipment"
import { shipOrder } from "~/src/modules/order/use-cases/ship-order"

const { shipx, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    shipx: {
      fetchShipxShipment: vi.fn<(shipmentId: string) => Promise<InpostShipment>>(),
      postShipxShipment: vi.fn<() => Promise<InpostShipment>>(),
    },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("http://127.0.0.1:3000/en-US/admin/orders") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } }),
}))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock(import("~/src/integrations/inpost/inpost.shipx.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchShipxShipment: shipx.fetchShipxShipment,
  postShipxShipment: shipx.postShipxShipment,
}))
vi.mock("~/src/integrations/resend/order-shipped.notification.server", () => ({ notifyOrderShipped: () => Promise.resolve(true) }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderShipmentCreatedAudit: vi.fn(),
  recordOrderShippedAudit: vi.fn(),
}))

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const SIZE_A_SHIPMENT_ID = SHIPX_SHIPMENT_ID

const SIZE_B_SHIPMENT_ID = SHIPX_SHIPMENT_ID + 1

const SIZE_B_TRACKING_NUMBER = "602677217131630339938799"

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const orderShipmentSchema = z.object({
  fulfillment_status: z.string(),
  inpost_shipment_id: z.string().nullable(),
  inpost_shipment_status: z.string().nullable(),
  tracking_number: z.string().nullable(),
  tracking_url: z.string().nullable(),
})

const readOrder = () =>
  orderShipmentSchema.parse(
    sqlite
      .prepare(
        `select fulfillment_status, inpost_shipment_id, inpost_shipment_status, tracking_number, tracking_url from "order" where id = ?`,
      )
      .get(ORDER_ID),
  )

const shipxReports = (fixture: object, id: number, trackingNumber: string | null): InpostShipment =>
  inpostShipmentSchema.parse({ ...fixture, id, tracking_number: trackingNumber })

const bookSizeA = () => createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "small" } })

const refresh = () => refreshInpostShipment({ data: { orderId: ORDER_ID } })

const trackingLink = (trackingNumber: string): string => `https://inpost.pl/sledzenie-przesylek?number=${trackingNumber}`

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type)
      values ('dm-locker', 'inpost_locker', 'courier-inpost', 'Paczkomat InPost', 1290, 'locker');
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`
    delete from order_address;
    delete from "order";
    insert into "order" (id, email, order_number, status, fulfillment_status, delivery_method_id, locker_id)
      values ('${ORDER_ID}', 'anna@example.test', 'MRT-2026-00012', 'processing', 'fulfilled', 'dm-locker', 'KRA012');
    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, phone, postal_code, type)
      values ('address-shipping', 'ul. Krucza 1/4', 'Warszawa', 'PL', 'Anna', 'Kowalska', '${ORDER_ID}', '+48501234567', '00-001', 'shipping');
  `)
  shipx.postShipxShipment.mockResolvedValue(shipxReports(shipxCreatedShipment, SIZE_A_SHIPMENT_ID, null))
  shipx.fetchShipxShipment.mockResolvedValue(shipxReports(shipxConfirmedShipment, SIZE_A_SHIPMENT_ID, SHIPX_TRACKING_NUMBER))
})

afterAll(() => {
  sqlite.close()
})

describe("an InPost shipment replaced outside the shop", () => {
  it("keeps the number the admin typed when shipping, whatever InPost later reports for the old shipment", async () => {
    await bookSizeA()
    await refresh()
    expect(readOrder().tracking_number).toBe(SHIPX_TRACKING_NUMBER)

    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: SIZE_B_TRACKING_NUMBER } })
    await refresh()
    shipx.fetchShipxShipment.mockResolvedValue(shipxReports(shipxCanceledShipment, SIZE_A_SHIPMENT_ID, SHIPX_TRACKING_NUMBER))
    await refresh()

    expect(readOrder()).toStrictEqual({
      fulfillment_status: "shipped",
      inpost_shipment_id: String(SIZE_A_SHIPMENT_ID),
      inpost_shipment_status: "canceled",
      tracking_number: SIZE_B_TRACKING_NUMBER,
      tracking_url: null,
    })
  })
})

describe("an InPost shipment cancelled before the order ships", () => {
  it("takes the cancelled shipment's tracking number off the order and lets the admin book a new one", async () => {
    await bookSizeA()
    await refresh()
    shipx.fetchShipxShipment.mockResolvedValue(shipxReports(shipxCanceledShipment, SIZE_A_SHIPMENT_ID, SHIPX_TRACKING_NUMBER))
    await refresh()

    expect(readOrder()).toMatchObject({ inpost_shipment_status: "canceled", tracking_number: null, tracking_url: null })

    shipx.postShipxShipment.mockResolvedValue(shipxReports(shipxCreatedShipment, SIZE_B_SHIPMENT_ID, null))
    await expect(createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "medium" } })).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
    shipx.fetchShipxShipment.mockResolvedValue(shipxReports(shipxConfirmedShipment, SIZE_B_SHIPMENT_ID, SIZE_B_TRACKING_NUMBER))
    await refresh()

    expect(shipx.fetchShipxShipment).toHaveBeenLastCalledWith(String(SIZE_B_SHIPMENT_ID))
    expect(readOrder()).toStrictEqual({
      fulfillment_status: "fulfilled",
      inpost_shipment_id: String(SIZE_B_SHIPMENT_ID),
      inpost_shipment_status: "confirmed",
      tracking_number: SIZE_B_TRACKING_NUMBER,
      tracking_url: trackingLink(SIZE_B_TRACKING_NUMBER),
    })
  })

  it("replaces tracking details a cancelled shipment left when InPost no longer reports its number", async () => {
    await bookSizeA()
    await refresh()
    shipx.fetchShipxShipment.mockResolvedValue(shipxReports(shipxCanceledShipment, SIZE_A_SHIPMENT_ID, null))
    await refresh()
    expect(readOrder().tracking_number).toBe(SHIPX_TRACKING_NUMBER)

    shipx.postShipxShipment.mockResolvedValue(shipxReports(shipxCreatedShipment, SIZE_B_SHIPMENT_ID, null))
    await createInpostShipment({ data: { orderId: ORDER_ID, parcelTemplate: "medium" } })

    expect(readOrder()).toMatchObject({ inpost_shipment_id: String(SIZE_B_SHIPMENT_ID), tracking_number: null, tracking_url: null })
  })

  it("books no second shipment while the first is still live", async () => {
    await bookSizeA()
    await refresh()

    await expect(bookSizeA()).rejects.toMatchObject(INVALID_STATE)
    expect(shipx.postShipxShipment).toHaveBeenCalledOnce()
  })
})

describe("a booking that finishes after the order shipped", () => {
  it("leaves the shipped order and its typed tracking number alone and names the extra shipment", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    shipx.postShipxShipment.mockImplementation(async () => {
      await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: SIZE_B_TRACKING_NUMBER } })

      return shipxReports(shipxCreatedShipment, SIZE_A_SHIPMENT_ID, null)
    })

    await expect(bookSizeA()).rejects.toMatchObject(INVALID_STATE)

    expect(readOrder()).toStrictEqual({
      fulfillment_status: "shipped",
      inpost_shipment_id: null,
      inpost_shipment_status: null,
      tracking_number: SIZE_B_TRACKING_NUMBER,
      tracking_url: null,
    })
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`ShipX shipment ${String(SIZE_A_SHIPMENT_ID)}`))
    log.mockRestore()
  })
})

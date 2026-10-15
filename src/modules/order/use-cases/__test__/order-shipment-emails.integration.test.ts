import { type ReactElement } from "react"

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { SHIPX_SHIPMENT_ID, SHIPX_TRACKING_NUMBER, shipxConfirmedShipment } from "~/src/integrations/inpost/__test__/fixtures/shipx"
import { type InpostShipment, inpostShipmentSchema } from "~/src/integrations/inpost/inpost.zod"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getOrderForShippedEmail } from "~/src/modules/order/order.accessors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { refreshInpostShipment } from "~/src/modules/order/use-cases/refresh-inpost-shipment"
import { shipOrder } from "~/src/modules/order/use-cases/ship-order"

import shippedCopy from "~/messages/pl-PL/emails.order-shipped.json"
import trackingCopy from "~/messages/pl-PL/emails.order-tracking.json"

const { fetchShipxShipment, sendEmail, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    fetchShipxShipment: vi.fn<(shipmentId: string) => Promise<InpostShipment>>(),
    sendEmail: vi.fn<(options: Readonly<SentEmail>) => Promise<string | undefined>>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

interface SentEmail {
  readonly idempotencyKey: string
  readonly react: ReactElement<Record<string, unknown>>
  readonly subject: string
  readonly to: string
}

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

  return { ...actual, getRequest: () => new Request("http://127.0.0.1:3000/pl-PL/admin/orders") }
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
  fetchShipxShipment,
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderEmailOutcome: vi.fn(),
  recordOrderShippedAudit: vi.fn(),
}))

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const SHIPPED = { kind: "order-shipped", status: "sent" }

const ALREADY_SENT = { kind: "order-shipped", status: "alreadySent" }

const TRACKING_SENT = { kind: "order-tracking", status: "sent" }

const ship = (tracking: { readonly trackingNumber?: string } = {}) => shipOrder({ data: { orderId: ORDER_ID, ...tracking } })

const stepBackToFulfilled = (): void => {
  sqlite.prepare(`update "order" set fulfillment_status = 'fulfilled', shipped_at = null where id = ?`).run(ORDER_ID)
}

const sentEmails = (): SentEmail[] => sendEmail.mock.calls.map(([email]) => email)

const sentSubjects = (): string[] => sentEmails().map((email) => email.subject)

const readClaims = () =>
  z
    .object({ shipped_email_at: z.number().nullable(), tracking_email_number: z.string().nullable() })
    .parse(sqlite.prepare(`select shipped_email_at, tracking_email_number from "order" where id = ?`).get(ORDER_ID))

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type)
      values ('dm-courier', 'inpost_courier', 'courier-inpost', 'Kurier InPost', 1999, 'courier');
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`
    delete from order_address;
    delete from "order";
    insert into "order" (id, email, order_number, status, fulfillment_status, delivery_method_id, metadata, inpost_shipment_id)
      values ('${ORDER_ID}', 'anna@example.test', 'MRT-2026-00012', 'processing', 'fulfilled', 'dm-courier', '{"locale":"pl-PL"}', '${String(SHIPX_SHIPMENT_ID)}');
    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, postal_code, type)
      values ('address-shipping', 'ul. Krucza 1/4', 'Warszawa', 'PL', 'Anna', 'Kowalska', '${ORDER_ID}', '00-001', 'shipping');
  `)
  sendEmail.mockResolvedValue(undefined)
  fetchShipxShipment.mockResolvedValue(inpostShipmentSchema.parse(shipxConfirmedShipment))
})

afterAll(() => {
  sqlite.close()
})

describe("the shipped email", () => {
  it("goes out once when the order is marked shipped, with the number, the carrier and the tracking link", async () => {
    await expect(ship({ trackingNumber: "TRK-42" })).resolves.toMatchObject({ email: SHIPPED })

    expect(sentSubjects()).toStrictEqual([shippedCopy.subject])
    expect(sentEmails()[0]?.idempotencyKey).toBe(`order-shipped/${ORDER_ID}`)
    expect(sentEmails()[0]?.react.props["details"]).toMatchObject({
      carrier: "InPost",
      trackingNumber: "TRK-42",
      trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=TRK-42",
    })
    expect(readClaims()).toMatchObject({ tracking_email_number: "TRK-42" })
  })

  it("is not sent a second time when a second click ships the same order", async () => {
    await ship()

    await expect(ship()).rejects.toMatchObject(INVALID_STATE)
    expect(sentSubjects()).toStrictEqual([shippedCopy.subject])
  })

  it("is not sent again when an order stepped back is shipped again", async () => {
    await ship({ trackingNumber: "TRK-42" })
    stepBackToFulfilled()

    await expect(ship()).resolves.toMatchObject({ email: ALREADY_SENT })
    expect(sentSubjects()).toStrictEqual([shippedCopy.subject])
  })
})

describe("the order the shipment emails read", () => {
  it("carries the order's own address snapshot, its delivery method and carrier, and its tracking", async () => {
    await ship({ trackingNumber: "TRK-42" })

    await expect(getOrderForShippedEmail(ORDER_ID)).resolves.toMatchObject({
      addresses: [{ address1: "ul. Krucza 1/4", type: "shipping" }],
      checkout: null,
      deliveryMethod: { courier: { name: "InPost" }, name: "Kurier InPost", type: "courier" },
      email: "anna@example.test",
      lockerId: null,
      orderNumber: "MRT-2026-00012",
      trackingNumber: "TRK-42",
      trackingUrl: null,
      userId: null,
    })
  })
})

describe("the tracking number email", () => {
  it("brings a new number typed when the order is shipped again, once", async () => {
    await ship({ trackingNumber: "TRK-42" })
    stepBackToFulfilled()

    await expect(ship({ trackingNumber: "TRK-43" })).resolves.toMatchObject({ email: TRACKING_SENT })
    stepBackToFulfilled()
    await expect(ship()).resolves.toMatchObject({ email: ALREADY_SENT })

    expect(sentSubjects()).toStrictEqual([shippedCopy.subject, trackingCopy.subject])
    expect(sentEmails()[1]?.idempotencyKey).toBe(`order-tracking/${ORDER_ID}/TRK-43`)
    expect(sentEmails()[1]?.react.props["tracking"]).toMatchObject({ trackingNumber: "TRK-43" })
  })

  it("brings the number InPost assigned after the parcel was marked shipped without one, once", async () => {
    await ship()
    await refreshInpostShipment({ data: { orderId: ORDER_ID } })
    await vi.waitFor(() => {
      expect(sentEmails()).toHaveLength(2)
    })
    await refreshInpostShipment({ data: { orderId: ORDER_ID } })

    expect(sentSubjects()).toStrictEqual([shippedCopy.subject, trackingCopy.subject])
    expect(sentEmails()[1]?.react.props["tracking"]).toMatchObject({
      carrier: "InPost",
      trackingNumber: SHIPX_TRACKING_NUMBER,
      trackingUrl: `https://inpost.pl/sledzenie-przesylek?number=${SHIPX_TRACKING_NUMBER}`,
    })
    expect(readClaims().tracking_email_number).toBe(SHIPX_TRACKING_NUMBER)
  })

  it("is not sent for a parcel that has not been marked shipped, whose number goes out with the shipped email", async () => {
    await refreshInpostShipment({ data: { orderId: ORDER_ID } })
    await ship()

    expect(sentSubjects()).toStrictEqual([shippedCopy.subject])
    expect(sentEmails()[0]?.react.props["details"]).toMatchObject({ trackingNumber: SHIPX_TRACKING_NUMBER })
  })
})

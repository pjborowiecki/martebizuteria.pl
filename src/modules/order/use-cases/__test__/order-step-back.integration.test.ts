import { type ReactElement } from "react"

import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { fulfillOrder } from "~/src/modules/order/use-cases/fulfill-order"
import { markOrderDelivered } from "~/src/modules/order/use-cases/mark-order-delivered"
import { shipOrder } from "~/src/modules/order/use-cases/ship-order"
import { stepBackOrder, stepBackOrderMutation } from "~/src/modules/order/use-cases/step-back-order"

import deliveredCopy from "~/messages/pl-PL/emails.order-delivered.json"
import inProgressCopy from "~/messages/pl-PL/emails.order-in-progress.json"
import shippedCopy from "~/messages/pl-PL/emails.order-shipped.json"
import trackingCopy from "~/messages/pl-PL/emails.order-tracking.json"

const { recordOrderSteppedBackAudit, scheduleAdminOrdersInvalidation, sendEmail, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    recordOrderSteppedBackAudit: vi.fn(),
    scheduleAdminOrdersInvalidation: vi.fn(),
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
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({ scheduleAdminOrdersInvalidation }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderDeliveredAudit: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderFulfillmentStartedAudit: vi.fn(),
  recordOrderShippedAudit: vi.fn(),
  recordOrderSteppedBackAudit,
}))

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const ALREADY_SENT = { status: "alreadySent" }

const fulfil = () => fulfillOrder({ data: { orderId: ORDER_ID } })

const ship = (trackingNumber?: string) =>
  shipOrder({ data: trackingNumber === undefined ? { orderId: ORDER_ID } : { orderId: ORDER_ID, trackingNumber } })

const deliver = () => markOrderDelivered({ data: { orderId: ORDER_ID } })

const stepBack = (fromStep: "delivered" | "processing" | "shipped") => stepBackOrder({ data: { fromStep, orderId: ORDER_ID } })

const sentSubjects = (): string[] => sendEmail.mock.calls.map(([email]) => email.subject)

const readOrder = () =>
  z
    .object({
      delivered_at: z.number().nullable(),
      fulfillment_started_at: z.number().nullable(),
      fulfillment_status: z.string(),
      shipped_at: z.number().nullable(),
      status: z.string(),
      tracking_number: z.string().nullable(),
    })
    .parse(
      sqlite
        .prepare(
          `select delivered_at, fulfillment_started_at, fulfillment_status, shipped_at, status, tracking_number from "order" where id = ?`,
        )
        .get(ORDER_ID),
    )

const setOrderStatus = (status: string): void => {
  sqlite.prepare(`update "order" set status = ? where id = ?`).run(status, ORDER_ID)
}

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
    insert into "order" (id, email, order_number, status, fulfillment_status, delivery_method_id, metadata)
      values ('${ORDER_ID}', 'anna@example.test', 'MRT-2026-00012', 'processing', 'not_fulfilled', 'dm-courier', '{"locale":"pl-PL"}');
    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, postal_code, type)
      values ('address-shipping', 'ul. Krucza 1/4', 'Warszawa', 'PL', 'Anna', 'Kowalska', '${ORDER_ID}', '00-001', 'shipping');
  `)
  sendEmail.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("stepping an order back", () => {
  it("returns an order in progress to confirmed and forgets when fulfilment started", async () => {
    await fulfil()

    await expect(stepBack("processing")).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID, toStep: "confirmed" })
    expect(readOrder()).toMatchObject({ fulfillment_started_at: null, fulfillment_status: "not_fulfilled", status: "processing" })
  })

  it("returns a shipped order to in progress and keeps its tracking number", async () => {
    await fulfil()
    await ship("00259007123456789012")

    await expect(stepBack("shipped")).resolves.toMatchObject({ toStep: "processing" })
    expect(readOrder()).toMatchObject({ fulfillment_status: "fulfilled", shipped_at: null, tracking_number: "00259007123456789012" })
  })

  it("reopens a delivered order as shipped", async () => {
    await fulfil()
    await ship()
    await deliver()

    await expect(stepBack("delivered")).resolves.toMatchObject({ toStep: "shipped" })
    expect(readOrder()).toMatchObject({ delivered_at: null, fulfillment_status: "shipped", status: "processing" })
  })

  it("records the move in the audit log with both steps and broadcasts it to open admin pages", async () => {
    await fulfil()
    await ship()
    await deliver()
    await stepBack("delivered")

    expect(recordOrderSteppedBackAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID, {
      metadata: {
        changed: ["fulfillmentStep", "orderStatus"],
        new: { fulfillmentStep: "shipped", orderStatus: "processing" },
        old: { fulfillmentStep: "delivered", orderStatus: "completed" },
      },
    })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
  })

  it("runs through its mutation options under the step-back key", async () => {
    await fulfil()

    expect(stepBackOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.STEP_BACK)
    await expect(
      new MutationObserver(new QueryClient(), stepBackOrderMutation).mutate({ fromStep: "processing", orderId: ORDER_ID }),
    ).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID, toStep: "confirmed" })
  })

  it("sends the customer no email of its own", async () => {
    await fulfil()
    sendEmail.mockClear()

    await stepBack("processing")

    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe("stepping an order back it cannot leave", () => {
  it("refuses a step the order is no longer at, so a second tab cannot step it back twice", async () => {
    await fulfil()
    await ship()
    await stepBack("shipped")

    await expect(stepBack("shipped")).rejects.toMatchObject(INVALID_STATE)
    expect(readOrder()).toMatchObject({ fulfillment_status: "fulfilled" })
    expect(recordOrderSteppedBackAudit).toHaveBeenCalledOnce()
  })

  it("refuses a confirmed order, which has no earlier step", async () => {
    await expect(stepBack("processing")).rejects.toMatchObject(INVALID_STATE)
  })

  it.each(["cancelled", "refunded"])("refuses a %s order", async (status) => {
    await fulfil()
    setOrderStatus(status)

    await expect(stepBack("processing")).rejects.toMatchObject(INVALID_STATE)
    expect(readOrder()).toMatchObject({ fulfillment_status: "fulfilled" })
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
  })

  it("refuses an order that does not exist", async () => {
    sqlite.exec(`delete from order_address; delete from "order";`)

    await expect(stepBack("processing")).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })
})

describe("moving an order forward again after a step back", () => {
  it("never sends the fulfilment, shipping or thank-you email a second time", async () => {
    await fulfil()
    await ship()
    await deliver()
    await stepBack("delivered")
    await stepBack("shipped")
    await stepBack("processing")

    await expect(fulfil()).resolves.toMatchObject({ email: { kind: "order-in-progress", ...ALREADY_SENT } })
    await expect(ship()).resolves.toMatchObject({ email: { kind: "order-shipped", ...ALREADY_SENT } })
    await expect(deliver()).resolves.toMatchObject({ email: { kind: "order-delivered", ...ALREADY_SENT } })
    expect(sentSubjects()).toStrictEqual([inProgressCopy.subject, shippedCopy.subject, deliveredCopy.subject])
  })

  it("sends only the new tracking number when the order ships again with another parcel", async () => {
    await fulfil()
    await ship("00259007123456789012")
    await stepBack("shipped")

    await expect(ship("00259007999999999999")).resolves.toMatchObject({ email: { kind: "order-tracking", status: "sent" } })
    expect(sentSubjects()).toStrictEqual([inProgressCopy.subject, shippedCopy.subject, trackingCopy.subject])
  })
})

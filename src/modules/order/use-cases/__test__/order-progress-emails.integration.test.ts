import { type ReactElement } from "react"

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { fulfillOrder } from "~/src/modules/order/use-cases/fulfill-order"
import { markOrderDelivered } from "~/src/modules/order/use-cases/mark-order-delivered"

import deliveredCopy from "~/messages/pl-PL/emails.order-delivered.json"
import inProgressCopy from "~/messages/pl-PL/emails.order-in-progress.json"

const { sendEmail, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
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
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderDeliveredAudit: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderFulfillmentStartedAudit: vi.fn(),
}))

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const fulfil = () => fulfillOrder({ data: { orderId: ORDER_ID } })

const deliver = () => markOrderDelivered({ data: { orderId: ORDER_ID } })

const markShipped = (): void => {
  sqlite.prepare(`update "order" set fulfillment_status = 'shipped', status = 'processing', delivered_at = null where id = ?`).run(ORDER_ID)
}

const stepBackToConfirmed = (): void => {
  sqlite.prepare(`update "order" set fulfillment_status = 'not_fulfilled', fulfillment_started_at = null where id = ?`).run(ORDER_ID)
}

const sentSubjects = (): string[] => sendEmail.mock.calls.map(([email]) => email.subject)

const readOrder = () =>
  z
    .object({ fulfillment_started_at: z.number().nullable(), fulfillment_status: z.string(), in_progress_email_at: z.number().nullable() })
    .parse(
      sqlite.prepare(`select fulfillment_status, fulfillment_started_at, in_progress_email_at from "order" where id = ?`).get(ORDER_ID),
    )

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type)
      values ('dm-locker', 'inpost_locker', 'courier-inpost', 'Paczkomat InPost', 1499, 'locker');
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`
    delete from "order";
    insert into "order" (id, email, order_number, status, fulfillment_status, delivery_method_id, metadata)
      values ('${ORDER_ID}', 'anna@example.test', 'MRT-2026-00012', 'processing', 'not_fulfilled', 'dm-locker', '{"locale":"pl-PL"}');
  `)
  sendEmail.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("the fulfilment started email", () => {
  it("goes out once when fulfilment starts, with what comes next for a parcel locker", async () => {
    await expect(fulfil()).resolves.toMatchObject({ email: { kind: "order-in-progress", status: "sent" } })

    expect(sentSubjects()).toStrictEqual([inProgressCopy.subject])
    expect(sendEmail.mock.calls[0]?.[0].idempotencyKey).toBe(`order-in-progress/${ORDER_ID}`)
    expect(readOrder()).toMatchObject({ fulfillment_status: "fulfilled" })
    expect(readOrder().fulfillment_started_at).toBeTypeOf("number")
    expect(readOrder().in_progress_email_at).toBeTypeOf("number")
  })

  it("is not sent a second time when a second click starts the same fulfilment", async () => {
    await fulfil()

    await expect(fulfil()).rejects.toMatchObject(INVALID_STATE)
    expect(sentSubjects()).toStrictEqual([inProgressCopy.subject])
  })

  it("is not sent again when an order stepped back starts fulfilment once more", async () => {
    await fulfil()
    stepBackToConfirmed()

    await expect(fulfil()).resolves.toMatchObject({ email: { kind: "order-in-progress", status: "alreadySent" } })
    expect(sentSubjects()).toStrictEqual([inProgressCopy.subject])
    expect(readOrder().fulfillment_started_at).toBeTypeOf("number")
  })
})

describe("the thank-you email", () => {
  beforeEach(() => {
    markShipped()
  })

  it("goes out once when the order is marked delivered, and completes the order", async () => {
    await expect(deliver()).resolves.toMatchObject({ email: { kind: "order-delivered", status: "sent" } })

    expect(sentSubjects()).toStrictEqual([deliveredCopy.subject])
    expect(sendEmail.mock.calls[0]?.[0].idempotencyKey).toBe(`order-delivered/${ORDER_ID}`)
    expect(z.object({ status: z.string() }).parse(sqlite.prepare(`select status from "order" where id = ?`).get(ORDER_ID)).status).toBe(
      "completed",
    )
  })

  it("is not sent a second time when a second click delivers the same order", async () => {
    await deliver()

    await expect(deliver()).rejects.toMatchObject(INVALID_STATE)
    expect(sentSubjects()).toStrictEqual([deliveredCopy.subject])
  })

  it("is not sent again when an order stepped back from delivered is delivered once more", async () => {
    await deliver()
    markShipped()

    await expect(deliver()).resolves.toMatchObject({ email: { kind: "order-delivered", status: "alreadySent" } })
    expect(sentSubjects()).toStrictEqual([deliveredCopy.subject])
  })
})

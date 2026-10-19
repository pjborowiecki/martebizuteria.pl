import type Stripe from "stripe"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import type * as DrizzleBatch from "~/src/integrations/drizzle-orm/drizzle.batch"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { getCheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"
import { getOrderConfirmation } from "~/src/modules/order/use-cases/get-order-confirmation"

import {
  checkoutSession,
  checkoutSessionAsyncPaymentFailedEvent,
  checkoutSessionAsyncPaymentSucceededEvent,
  checkoutSessionCompletedEvent,
} from "./fixtures/stripe-webhook-events"

const { audits, emails, invalidations, retrieveSession, runDrizzleBatch, sendIncidentAlert, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    audits: {
      recordDiscountRedeemedAudit: vi.fn(),
      recordOrderDisputeClosedAudit: vi.fn(),
      recordOrderDisputeOpenedAudit: vi.fn(),
      recordOrderFulfillmentFailedAudit: vi.fn<(sessionId: string, options: { detail: string }) => void>(),
      recordOrderPaymentCapturedAudit: vi.fn(),
      recordOrderPaymentFailedAudit: vi.fn(),
      recordOrderPlacedAudit: vi.fn(),
      recordOrderRefundAudit: vi.fn(),
      recordOrderReleasedAudit: vi.fn(),
    },
    emails: {
      sendNewOrderEmail: vi.fn<(orderId: string, returnUrl: string | undefined) => Promise<boolean>>(),
      sendOrderConfirmationEmail: vi.fn<(session: object, orderId: string) => Promise<boolean>>(),
      sendPaymentFailedEmail: vi.fn<(session: object) => Promise<boolean>>(),
    },
    invalidations: {
      scheduleAdminOrdersInvalidation: vi.fn(),
      scheduleProductCatalogInvalidation: vi.fn(),
    },
    retrieveSession: vi.fn<(sessionId: string, params: object) => Promise<object>>(),
    runDrizzleBatch: vi.fn<typeof DrizzleBatch.runDrizzleBatch>(),
    sendIncidentAlert: vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>(),
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

  return {
    ...actual,
    getRequest: () => new Request("https://marte.test/checkout", { headers: { "cf-connecting-ip": "203.0.113.7" } }),
  }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(null) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.batch"), async (importOriginal) => {
  const actual = await importOriginal()
  runDrizzleBatch.mockImplementation(actual.runDrizzleBatch)

  return { ...actual, runDrizzleBatch }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { retrieve: retrieveSession } } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => invalidations)
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => audits)
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert }))
vi.mock("~/src/modules/order/use-cases/send-order-confirmation-email.server", () => ({
  sendOrderConfirmationEmail: emails.sendOrderConfirmationEmail,
}))
vi.mock("~/src/modules/order/use-cases/send-new-order-email.server", () => ({ sendNewOrderEmail: emails.sendNewOrderEmail }))
vi.mock("~/src/modules/checkout/use-cases/send-payment-failed-email.server", () => ({
  sendPaymentFailedEmail: emails.sendPaymentFailedEmail,
}))

const SESSION_ID = "cs_test_luna"

const PAID_AMOUNT = 25_399

const NECKLACE_LINE = {
  handle: "naszyjnik-luna",
  imageUrl: "https://assets.test/luna.jpg",
  price: PAID_AMOUNT,
  qty: 1,
  title: "Naszyjnik Luna",
  variantId: "variant-luna",
}

const necklaceSession = (paymentStatus: Stripe.Checkout.Session["payment_status"]): Stripe.Checkout.Session =>
  checkoutSession({
    amountTotal: PAID_AMOUNT,
    customerEmail: "ada@marte.test",
    id: SESSION_ID,
    metadata: { checkoutId: "checkout-luna", items: JSON.stringify([NECKLACE_LINE]), locale: "pl-PL" },
    paymentIntent: "pi_test_luna",
    paymentStatus,
  })

const PAID_COMPLETED = checkoutSessionCompletedEvent(necklaceSession("paid"))

const PAID_SETTLED = checkoutSessionAsyncPaymentSucceededEvent(necklaceSession("paid"))

const UNPAID_COMPLETED = checkoutSessionCompletedEvent(necklaceSession("unpaid"))

const SETTLEMENT_FAILED = checkoutSessionAsyncPaymentFailedEvent(necklaceSession("unpaid"))

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const countRows = (table: string): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare(`select count(*) as total from "${table}"`).get()).total

const readNecklaceStock = () =>
  z
    .object({ quantity_available: z.number(), quantity_reserved: z.number() })
    .parse(sqlite.prepare("select quantity_available, quantity_reserved from inventory where variant_id = 'variant-luna'").get())

const readStatuses = () =>
  z
    .object({ checkout: z.string(), payment: z.string() })
    .parse(
      sqlite
        .prepare(
          "select checkout.status as checkout, payment.status as payment from payment join checkout on checkout.id = payment.checkout_id where payment.transaction_id = ?",
        )
        .get(SESSION_ID),
    )

const readIssuedOrderNumbers = (): number =>
  z.object({ issued: z.number() }).parse(sqlite.prepare("select coalesce(sum(last_value), 0) as issued from order_number_sequence").get())
    .issued

const expectOneOrderPlaced = (): void => {
  expect(countRows("order")).toBe(1)
  expect(countRows("order_item")).toBe(1)
  expect(readIssuedOrderNumbers()).toBe(1)
  expect(readStatuses()).toStrictEqual({ checkout: "completed", payment: "succeeded" })
  expect(readNecklaceStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 0 })
  expect(audits.recordOrderPlacedAudit).toHaveBeenCalledOnce()
  expect(audits.recordOrderPaymentCapturedAudit).toHaveBeenCalledOnce()
  expect(emails.sendOrderConfirmationEmail).toHaveBeenCalledOnce()
  expect(emails.sendNewOrderEmail).toHaveBeenCalledOnce()
  expect(audits.recordOrderFulfillmentFailedAudit).not.toHaveBeenCalled()
  expect(sendIncidentAlert).not.toHaveBeenCalled()
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-luna', 'naszyjnik-luna', 'published', '{"pl-PL":"Naszyjnik Luna"}');
    insert into product_variant (id, product_id, title) values ('variant-luna', 'product-luna', 'Srebro');
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-luna', 'variant-luna', 0, 1);
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
  sqlite.exec(`
    drop trigger if exists order_insert_fails;
    delete from rate_limit;
    delete from order_item;
    delete from "order";
    delete from order_number_sequence;
    delete from payment;
    delete from checkout;
    update inventory set quantity_available = 0, quantity_reserved = 1 where variant_id = 'variant-luna';
    insert into checkout (id, email, status) values ('checkout-luna', 'ada@marte.test', 'pending');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-luna', 'checkout-luna', ${String(PAID_AMOUNT)}, 'stripe', 'pending', '${SESSION_ID}', '[{"qty":1,"variantId":"variant-luna"}]');
  `)
  emails.sendOrderConfirmationEmail.mockResolvedValue(true)
  emails.sendNewOrderEmail.mockResolvedValue(true)
  emails.sendPaymentFailedEmail.mockResolvedValue(true)
  sendIncidentAlert.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("a paid session whose completed event Stripe delivers twice in the same second", () => {
  it("places one order, announces it once and acknowledges both deliveries", async () => {
    await expect(Promise.all([dispatch(PAID_COMPLETED), dispatch(PAID_COMPLETED)])).resolves.toStrictEqual([undefined, undefined])

    expectOneOrderPlaced()
  })

  it("acknowledges later redeliveries without a second order or email", async () => {
    await dispatch(PAID_COMPLETED)
    await dispatch(PAID_COMPLETED)
    await dispatch(PAID_COMPLETED)

    expectOneOrderPlaced()
  })

  it("places one order while the return page asks for the session's status at the same time", async () => {
    retrieveSession.mockResolvedValue({
      id: SESSION_ID,
      payment_intent: { status: "succeeded" },
      payment_status: "paid",
      status: "complete",
    })

    const [status] = await Promise.all([
      getCheckoutSessionStatus({ data: { sessionId: SESSION_ID } }),
      dispatch(PAID_COMPLETED),
      dispatch(PAID_COMPLETED),
    ])

    expect(status).toBe("complete")
    expectOneOrderPlaced()
  })
})

const confirmationOf = () => getOrderConfirmation({ data: { sessionId: SESSION_ID } })

describe("a paid session whose shopper reaches the return page before its webhook", () => {
  beforeEach(() => {
    retrieveSession.mockResolvedValue(necklaceSession("paid"))
  })

  it("places the order from the return page and leaves the late webhook nothing to do", async () => {
    await expect(confirmationOf()).resolves.toMatchObject({
      email: "ada@marte.test",
      items: [expect.objectContaining({ quantity: 1, title: "Naszyjnik Luna" })],
      totalMinorUnits: PAID_AMOUNT,
    })
    expect(retrieveSession).toHaveBeenCalledExactlyOnceWith(SESSION_ID)

    await dispatch(PAID_COMPLETED)
    await dispatch(PAID_COMPLETED)

    expectOneOrderPlaced()
  })

  it("places one order, announces it once and still shows it when the return page and two deliveries of the event arrive together", async () => {
    const [confirmation] = await Promise.all([confirmationOf(), dispatch(PAID_COMPLETED), dispatch(PAID_COMPLETED)])

    expect(confirmation).toMatchObject({ email: "ada@marte.test", totalMinorUnits: PAID_AMOUNT })
    expectOneOrderPlaced()
  })

  it("reads the order the webhook placed without asking Stripe again", async () => {
    await dispatch(PAID_COMPLETED)

    await expect(confirmationOf()).resolves.toMatchObject({ email: "ada@marte.test" })
    expect(retrieveSession).not.toHaveBeenCalled()
    expectOneOrderPlaced()
  })

  it("places no order and shows nothing yet while the payment has not settled", async () => {
    retrieveSession.mockResolvedValue(necklaceSession("unpaid"))

    await expect(confirmationOf()).resolves.toBeUndefined()

    expect(countRows("order")).toBe(0)
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
    expect(emails.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it("leaves a paid session whose order cannot be written to the webhook, without recording or alerting twice", async () => {
    sqlite.exec(`create trigger order_insert_fails before insert on "order" begin select raise(abort, 'disk I/O error'); end;`)

    await expect(confirmationOf()).resolves.toBeUndefined()

    expect(countRows("order")).toBe(0)
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
    expect(audits.recordOrderFulfillmentFailedAudit).not.toHaveBeenCalled()
    expect(sendIncidentAlert).not.toHaveBeenCalled()
  })
})

describe("a session that completes before its payment settles, as a delayed-notification payment method leaves it", () => {
  it("creates no order and sends no confirmation while the payment is unpaid", async () => {
    await dispatch(UNPAID_COMPLETED)

    expect(countRows("order")).toBe(0)
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
    expect(readNecklaceStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 1 })
    expect(emails.sendOrderConfirmationEmail).not.toHaveBeenCalled()
    expect(emails.sendNewOrderEmail).not.toHaveBeenCalled()
    expect(audits.recordOrderPlacedAudit).not.toHaveBeenCalled()
  })

  it("places the order once the asynchronous payment succeeds, even when Stripe reports it twice", async () => {
    await dispatch(UNPAID_COMPLETED)
    await Promise.all([dispatch(PAID_SETTLED), dispatch(PAID_SETTLED)])

    expectOneOrderPlaced()
  })

  it("returns the reservation once and tells the shopper once when the asynchronous payment fails", async () => {
    await dispatch(UNPAID_COMPLETED)
    await Promise.all([dispatch(SETTLEMENT_FAILED), dispatch(SETTLEMENT_FAILED)])

    expect(countRows("order")).toBe(0)
    expect(readStatuses()).toStrictEqual({ checkout: "failed", payment: "failed" })
    expect(readNecklaceStock()).toStrictEqual({ quantity_available: 1, quantity_reserved: 0 })
    expect(emails.sendPaymentFailedEmail).toHaveBeenCalledOnce()
    expect(emails.sendOrderConfirmationEmail).not.toHaveBeenCalled()
    await expect(getCheckoutSessionStatus({ data: { sessionId: SESSION_ID } })).resolves.toBe("closed")
    expect(retrieveSession).not.toHaveBeenCalled()
  })
})

describe("a paid session whose batch commits although D1 answers with an error", () => {
  it("announces the order its own batch wrote and acknowledges the event", async () => {
    const { runDrizzleBatch: commitBatch } = await vi.importActual<typeof DrizzleBatch>("~/src/integrations/drizzle-orm/drizzle.batch")
    runDrizzleBatch.mockImplementationOnce(async (statements) => {
      await commitBatch(statements)
      throw new Error("D1_ERROR: Network connection lost.")
    })
    vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(dispatch(PAID_COMPLETED)).resolves.toBeUndefined()

    expectOneOrderPlaced()
  })
})

describe("a paid session whose order really cannot be written", () => {
  it("records the failure and fails the event so Stripe retries it", async () => {
    sqlite.exec(`create trigger order_insert_fails before insert on "order" begin select raise(abort, 'disk I/O error'); end;`)

    await expect(dispatch(PAID_COMPLETED)).rejects.toThrow("disk I/O error")

    expect(countRows("order")).toBe(0)
    expect(readStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
    expect(readNecklaceStock()).toStrictEqual({ quantity_available: 0, quantity_reserved: 1 })
    expect(audits.recordOrderFulfillmentFailedAudit).toHaveBeenCalledOnce()
    expect(audits.recordOrderFulfillmentFailedAudit.mock.calls[0]?.[0]).toBe(SESSION_ID)
    expect(audits.recordOrderFulfillmentFailedAudit.mock.calls[0]?.[1].detail).toMatch(/^253,99 PLN — ada@marte\.test — .*disk I\/O error/u)
    expect(emails.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })
})

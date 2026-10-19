import { type ReactElement } from "react"

import { MutationObserver, QueryClient } from "@tanstack/react-query"
import type Stripe from "stripe"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { charge, chargeRefundedEvent } from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { cancelOrder, cancelOrderMutation } from "~/src/modules/order/use-cases/cancel-order"
import { refundAdminOrder } from "~/src/modules/order/use-cases/refund-admin-order"

import cancelledCopy from "~/messages/pl-PL/emails.order-cancelled.json"
import refundedCopy from "~/messages/pl-PL/emails.order-refunded.json"

const { audit, catalogInvalidated, requestSession, sendEmail, sqlite, stripeApi } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    audit: { cancelled: vi.fn(), email: vi.fn(), refund: vi.fn(), refundRequested: vi.fn(), restocked: vi.fn() },
    catalogInvalidated: vi.fn(),
    requestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } }>>(),
    sendEmail: vi.fn<(options: Readonly<SentEmail>) => Promise<string | undefined>>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stripeApi: {
      refunds: { standing: [] as { amount: number; id: string; status: string }[] },
      refundsCreate: vi.fn<(params: object, options: object) => Promise<{ amount: number; id: string }>>(),
      refundsList:
        vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<{ amount: number; id: string; status: string }[]> }>(),
      sessionsList: vi.fn<(params: object) => Promise<{ data: { id: string; return_url: string }[] }>>(),
      sessionsRetrieve: vi.fn<(id: string) => Promise<{ payment_intent: string; payment_status: "paid" }>>(),
    },
  }
})

interface SentEmail {
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

  return { ...actual, getRequest: () => new Request(`${SHOP_ORIGIN}/en-US/admin/orders`) }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: requestSession }))
vi.mock(import("~/src/integrations/better-auth/auth.access"), async (importOriginal) => {
  const actual = await importOriginal()
  const orderClerk = actual.ac.newRole({ order: ["read", "update"] })

  return {
    ...actual,
    hasPermission: ({ permission, role }) =>
      role === ORDER_CLERK_ROLE ? orderClerk.authorize(permission).success : actual.hasPermission({ permission, role }),
  }
})
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: {
    checkout: { sessions: { list: stripeApi.sessionsList, retrieve: stripeApi.sessionsRetrieve } },
    refunds: { create: stripeApi.refundsCreate, list: stripeApi.refundsList },
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: catalogInvalidated,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordOrderEmailOutcome: audit.email,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordOrderCancelledAudit: audit.cancelled,
  recordOrderRefundAudit: audit.refund,
  recordOrderRefundRequestedAudit: audit.refundRequested,
  recordOrderRestockedAudit: audit.restocked,
}))

const SHOP_ORIGIN = "http://127.0.0.1:3000"

const ORDER_CLERK_ROLE = "order-clerk"

const PAID_ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const FREE_ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234568"

const PAID_AMOUNT = 38_900

const REFUND_REQUEST = { metadata: { orderId: PAID_ORDER_ID }, payment_intent: "pi_paid" }

const REFUND_KEY = { idempotencyKey: `admin-order-refund-${PAID_ORDER_ID}-0` }

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const OPEN_DISPUTE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.OPEN_DISPUTE }

const STOCK_HELD = { "variant-chain": 3, "variant-ring": 0 }

const STOCK_RETURNED = { "variant-chain": 5, "variant-ring": 1 }

const DISPUTED = JSON.stringify({ dispute: { amount: PAID_AMOUNT, id: "dp_1", reason: "fraudulent", status: "needs_response" } })

const seedOrders = (): void => {
  sqlite.exec(`
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    update inventory set quantity_available = 3 where variant_id = 'variant-chain';
    update inventory set quantity_available = 0 where variant_id = 'variant-ring';
    insert into checkout (id, email, status) values ('checkout-paid', 'ada@marte.test', 'completed'), ('checkout-free', 'grace@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id) values
      ('payment-paid', 'checkout-paid', ${String(PAID_AMOUNT)}, 'stripe', 'succeeded', 'cs_paid'),
      ('payment-free', 'checkout-free', 0, 'stripe', 'succeeded', 'cs_free');
    insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total) values
      ('${PAID_ORDER_ID}', 'checkout-paid', 'payment-paid', 'ada@marte.test', 'MRT-2026-00001', 'processing', 'not_fulfilled', ${String(PAID_AMOUNT)}),
      ('${FREE_ORDER_ID}', 'checkout-free', 'payment-free', 'grace@marte.test', 'MRT-2026-00002', 'processing', 'not_fulfilled', 0);
    insert into order_item (id, order_id, variant_id, quantity, subtotal, title, total, unit_price) values
      ('item-ring', '${PAID_ORDER_ID}', 'variant-ring', 1, 18900, 'Ring', 18900, 18900),
      ('item-chain', '${PAID_ORDER_ID}', 'variant-chain', 2, 20000, 'Chain', 20000, 10000),
      ('item-retired', '${PAID_ORDER_ID}', null, 1, 0, 'Retired piece', 0, 0),
      ('item-free', '${FREE_ORDER_ID}', 'variant-chain', 1, 0, 'Chain', 0, 0);
  `)
}

const updatePaidOrder = (assignments: string): void => {
  sqlite.prepare(`update "order" set ${assignments} where id = ?`).run(PAID_ORDER_ID)
}

const stockRowsSchema = z.array(z.object({ quantity_available: z.number(), variant_id: z.string() }))

const readStock = (): Record<string, number> => {
  const rows = stockRowsSchema.parse(sqlite.prepare(`select variant_id, quantity_available from inventory order by variant_id`).all())

  return Object.fromEntries(rows.map((row) => [row.variant_id, row.quantity_available]))
}

const readOrder = (orderId: string) =>
  z
    .object({ fulfillment_status: z.string(), status: z.string() })
    .parse(sqlite.prepare(`select status, fulfillment_status from "order" where id = ?`).get(orderId))

const readPaidPayment = () =>
  z
    .object({ refunded_amount: z.number(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount from payment where id = 'payment-paid'`).get())

const confirmRefundFromStripe = async (amountRefunded = PAID_AMOUNT): Promise<void> => {
  stripeApi.refunds.standing = [{ amount: amountRefunded, id: `re_${String(amountRefunded)}`, status: "succeeded" }]
  const event: Stripe.Event = chargeRefundedEvent(charge({ amount: PAID_AMOUNT, amountRefunded, paymentIntent: "pi_paid" }))
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error("No webhook handler records charge.refunded")
  }

  await handler(event)
}

const cancelPaidOrder = () => cancelOrder({ data: { orderId: PAID_ORDER_ID } })

const sentEmails = (): SentEmail[] => sendEmail.mock.calls.map(([email]) => email)

const sentSubjects = (): string[] => sentEmails().map((email) => email.subject)

const sentProps = (): Record<string, unknown>[] => sentEmails().map((email) => email.react.props)

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-aura', 'aura', 'published', '{"en-US":"Aura"}');
    insert into product_variant (id, product_id, title) values ('variant-ring', 'product-aura', 'Ring'), ('variant-chain', 'product-aura', 'Chain');
    insert into inventory (id, variant_id, quantity_available) values ('inventory-ring', 'variant-ring', 0), ('inventory-chain', 'variant-chain', 3);
  `)
})

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  seedOrders()
  requestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  stripeApi.sessionsList.mockResolvedValue({ data: [{ id: "cs_paid", return_url: `${SHOP_ORIGIN}/pl-PL/checkout?success=true` }] })
  stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: "pi_paid", payment_status: "paid" })
  stripeApi.refundsCreate.mockResolvedValue({ amount: PAID_AMOUNT, id: "re_paid" })
  stripeApi.refunds.standing = []
  stripeApi.refundsList.mockImplementation(() => ({ autoPagingToArray: () => Promise.resolve(stripeApi.refunds.standing) }))
  sendEmail.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("cancelling a paid order", () => {
  it("asks Stripe for the full refund under the same key as the Refund button", async () => {
    await expect(cancelPaidOrder()).resolves.toStrictEqual({ cancelledEmailSent: true, ok: true, orderId: PAID_ORDER_ID })

    expect(stripeApi.sessionsRetrieve).toHaveBeenCalledExactlyOnceWith("cs_paid")
    expect(stripeApi.refundsCreate).toHaveBeenCalledExactlyOnceWith(REFUND_REQUEST, REFUND_KEY)
    expect(audit.refundRequested).toHaveBeenCalledExactlyOnceWith(PAID_ORDER_ID)
  })

  it("cancels the order and returns its stock, passing over a line whose variant is gone", async () => {
    await cancelPaidOrder()

    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.cancelled).toHaveBeenCalledExactlyOnceWith(PAID_ORDER_ID)
    expect(catalogInvalidated).toHaveBeenCalledOnce()
  })

  it("keeps the order cancelled and its stock returned once when Stripe confirms the refund", async () => {
    await cancelPaidOrder()
    await confirmRefundFromStripe()

    expect(readPaidPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it.each([
    ["processing", "shipped"],
    ["completed", "delivered"],
  ])("refuses a %s order whose parcel was %s, without asking Stripe", async (status, fulfillmentStatus) => {
    updatePaidOrder(`status = '${status}', fulfillment_status = '${fulfillmentStatus}'`)

    await expect(cancelPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: fulfillmentStatus, status })
    expect(readStock()).toStrictEqual(STOCK_HELD)
  })

  it("refuses while a dispute is open and names the dispute, since the dispute decides the payment", async () => {
    sqlite.prepare(`update "order" set metadata = ? where id = ?`).run(DISPUTED, PAID_ORDER_ID)

    await expect(cancelPaidOrder()).rejects.toMatchObject(OPEN_DISPUTE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readStock()).toStrictEqual(STOCK_HELD)
  })

  it("leaves the order open and its stock held when Stripe refuses the refund", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    stripeApi.refundsCreate.mockRejectedValue(new Error("This charge has already been refunded."))

    await expect(cancelPaidOrder()).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })
    expect(consoleError).toHaveBeenCalledOnce()
    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: "not_fulfilled", status: "processing" })
    expect(readStock()).toStrictEqual(STOCK_HELD)
    expect(audit.refundRequested).not.toHaveBeenCalled()
    expect(audit.cancelled).not.toHaveBeenCalled()
  })

  it("reports the order closed when the refund webhook lands first, returning its stock only once", async () => {
    stripeApi.refundsCreate.mockImplementation(async () => {
      await confirmRefundFromStripe()

      return { amount: PAID_AMOUNT, id: "re_paid" }
    })

    await expect(cancelPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(readOrder(PAID_ORDER_ID).status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.cancelled).not.toHaveBeenCalled()
  })

  it("cancels an order confirmed twice at once only once", async () => {
    const outcomes = await Promise.allSettled([cancelPaidOrder(), cancelPaidOrder()])

    expect(outcomes.map((outcome) => outcome.status).toSorted()).toStrictEqual(["fulfilled", "rejected"])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.cancelled).toHaveBeenCalledOnce()
  })
})

describe("refunds before and after a cancellation", () => {
  it("refuses to cancel an order the Refund button already refunded and restocked, so its stock is not returned twice", async () => {
    await refundAdminOrder({ data: { orderId: PAID_ORDER_ID, restock: true } })
    await confirmRefundFromStripe()

    await expect(cancelPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.refundsCreate).toHaveBeenCalledExactlyOnceWith(REFUND_REQUEST, REFUND_KEY)
    expect(readOrder(PAID_ORDER_ID).status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("cancels an order the Refund button restocked before Stripe confirmed, without returning its stock again", async () => {
    await refundAdminOrder({ data: { orderId: PAID_ORDER_ID, restock: true } })

    await expect(cancelPaidOrder()).resolves.toMatchObject({ ok: true })
    await confirmRefundFromStripe()

    expect(stripeApi.refundsCreate).toHaveBeenNthCalledWith(2, REFUND_REQUEST, REFUND_KEY)
    expect(readOrder(PAID_ORDER_ID).status).toBe("cancelled")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("keeps an order cancelled without a refund cancelled, its stock returned once, when the Stripe dashboard refunds it", async () => {
    updatePaidOrder(`status = 'cancelled', fulfillment_status = 'cancelled'`)
    sqlite.exec(`
      update inventory set quantity_available = 5 where variant_id = 'variant-chain';
      update inventory set quantity_available = 1 where variant_id = 'variant-ring';
    `)

    await confirmRefundFromStripe()
    await confirmRefundFromStripe()

    expect(readPaidPayment().status).toBe("refunded")
    expect(readOrder(PAID_ORDER_ID).status).toBe("cancelled")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.refund).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe("emails to the customer", () => {
  it("tells the customer once that the order was cancelled and refunded, and nothing more when Stripe confirms that refund", async () => {
    await cancelPaidOrder()
    await confirmRefundFromStripe()
    await confirmRefundFromStripe()

    expect(sentSubjects()).toStrictEqual([cancelledCopy.subject])
    expect(sentEmails()[0]?.to).toBe("ada@marte.test")
    expect(sentProps()[0]).toMatchObject({ currency: "PLN", locale: "pl-PL", orderNumber: "MRT-2026-00001", refundedAmount: PAID_AMOUNT })
  })

  it("links the cancellation to the deployment the admin cancelled the order on", async () => {
    await cancelPaidOrder()

    expect(sentProps()[0]).toMatchObject({ accountCta: { href: `${SHOP_ORIGIN}/auth/sign-up`, isGuest: true } })
  })

  it("tells the customer of a free order that it was cancelled with nothing to refund", async () => {
    await cancelOrder({ data: { orderId: FREE_ORDER_ID } })

    expect(sentSubjects()).toStrictEqual([cancelledCopy.subject])
    expect(sentEmails()[0]?.to).toBe("grace@marte.test")
    expect(sentProps()[0]?.["refundedAmount"]).toBeUndefined()
  })

  it("cancels the order and records the failure when the cancellation email cannot be sent", async () => {
    vi.useFakeTimers()
    sendEmail.mockResolvedValue("The marte.test domain is not verified")

    await expect(cancelPaidOrder()).resolves.toStrictEqual({ cancelledEmailSent: false, ok: true, orderId: PAID_ORDER_ID })
    expect(readOrder(PAID_ORDER_ID).status).toBe("cancelled")
    expect(audit.email).toHaveBeenCalledExactlyOnceWith({
      failure: "The marte.test domain is not verified",
      label: "Order cancelled → ada@marte.test",
      metadata: {
        idempotencyKey: `order-cancelled/${PAID_ORDER_ID}`,
        orderEmail: { kind: "order-cancelled", refundedAmount: PAID_AMOUNT },
      },
      orderId: PAID_ORDER_ID,
      willRetry: true,
    })

    await vi.runAllTimersAsync()

    expect(readOrder(PAID_ORDER_ID).status).toBe("cancelled")
    expect(sendEmail).toHaveBeenCalledTimes(3)
    expect(audit.email).toHaveBeenLastCalledWith(
      expect.objectContaining({ failure: "The marte.test domain is not verified", willRetry: false }),
    )
  })

  it("tells the customer once about the Refund button's refund, however often Stripe delivers its confirmation", async () => {
    await refundAdminOrder({ data: { orderId: PAID_ORDER_ID, restock: false } })
    await confirmRefundFromStripe()
    await confirmRefundFromStripe()

    expect(sentSubjects()).toStrictEqual([refundedCopy.subject])
    expect(sentProps()[0]).toMatchObject({ fullyRefunded: true, orderTotal: PAID_AMOUNT, refundedAmount: PAID_AMOUNT })
    expect(audit.email).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Order refunded → ada@marte.test",
      metadata: {
        idempotencyKey: `order-refunded/${PAID_ORDER_ID}/re_${String(PAID_AMOUNT)}`,
        orderEmail: {
          amount: PAID_AMOUNT,
          fullyRefunded: true,
          kind: "order-refunded",
          refundId: `re_${String(PAID_AMOUNT)}`,
          refundedTotal: PAID_AMOUNT,
        },
      },
      orderId: PAID_ORDER_ID,
      willRetry: false,
    })
  })

  it("tells the customer about each partial refund made in the Stripe dashboard once, with the amount of that refund", async () => {
    await confirmRefundFromStripe(10_000)
    await confirmRefundFromStripe(10_000)
    await confirmRefundFromStripe(PAID_AMOUNT)

    expect(sentSubjects()).toStrictEqual([refundedCopy.subject, refundedCopy.subject])
    expect(sentProps()).toMatchObject([
      { fullyRefunded: false, refundedAmount: 10_000 },
      { fullyRefunded: true, refundedAmount: PAID_AMOUNT - 10_000 },
    ])
  })

  it("tells the customer once about dashboard refunds whose confirmations arrive out of order and again, and only the new amount of a later one", async () => {
    await confirmRefundFromStripe(30_000)
    await confirmRefundFromStripe(10_000)
    await confirmRefundFromStripe(30_000)

    expect(readPaidPayment()).toStrictEqual({ refunded_amount: 30_000, status: "succeeded" })
    expect(sentProps()).toMatchObject([{ fullyRefunded: false, refundedAmount: 30_000 }])

    await confirmRefundFromStripe(PAID_AMOUNT)

    expect(sentProps()).toMatchObject([
      { fullyRefunded: false, refundedAmount: 30_000 },
      { fullyRefunded: true, refundedAmount: PAID_AMOUNT - 30_000 },
    ])
  })

  it("sends only the refund email when the refund's confirmation closes the order before the cancellation can", async () => {
    stripeApi.refundsCreate.mockImplementation(async () => {
      await confirmRefundFromStripe()

      return { amount: PAID_AMOUNT, id: "re_paid" }
    })

    await expect(cancelPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(sentSubjects()).toStrictEqual([refundedCopy.subject])
  })
})

describe("cancelling an order with nothing to refund", () => {
  it("cancels a free order and returns its stock without calling Stripe", async () => {
    await expect(cancelOrder({ data: { orderId: FREE_ORDER_ID } })).resolves.toStrictEqual({
      cancelledEmailSent: true,
      ok: true,
      orderId: FREE_ORDER_ID,
    })

    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(audit.refundRequested).not.toHaveBeenCalled()
    expect(readOrder(FREE_ORDER_ID)).toStrictEqual({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(readStock()).toStrictEqual({ ...STOCK_HELD, "variant-chain": 4 })
  })
})

describe("a role that may update orders but not refund them", () => {
  beforeEach(() => {
    requestSession.mockResolvedValue({ user: { role: ORDER_CLERK_ROLE } })
  })

  it("is refused the Refund button before Stripe is asked or stock returns", async () => {
    await expect(refundAdminOrder({ data: { orderId: PAID_ORDER_ID, restock: true } })).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })

    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readStock()).toStrictEqual(STOCK_HELD)
  })

  it("is refused the cancellation of a paid order, which would refund it, and leaves the order open", async () => {
    await expect(cancelPaidOrder()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })

    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: "not_fulfilled", status: "processing" })
    expect(readStock()).toStrictEqual(STOCK_HELD)
    expect(audit.cancelled).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("is refused a disputed paid order for lacking the refund permission before the dispute is named", async () => {
    sqlite.prepare(`update "order" set metadata = ? where id = ?`).run(DISPUTED, PAID_ORDER_ID)

    await expect(cancelPaidOrder()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })

    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(readOrder(PAID_ORDER_ID)).toStrictEqual({ fulfillment_status: "not_fulfilled", status: "processing" })
    expect(readStock()).toStrictEqual(STOCK_HELD)
  })

  it("cancels a free order, which refunds nothing", async () => {
    await expect(cancelOrder({ data: { orderId: FREE_ORDER_ID } })).resolves.toStrictEqual({
      cancelledEmailSent: true,
      ok: true,
      orderId: FREE_ORDER_ID,
    })

    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readOrder(FREE_ORDER_ID)).toStrictEqual({ fulfillment_status: "cancelled", status: "cancelled" })
  })
})

describe("cancelOrder requests", () => {
  it("reports a missing order as not found", async () => {
    await expect(cancelOrder({ data: { orderId: "0192f3a4-5b6c-7d8e-9fab-cdef01234569" } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: ORDER_ERROR_CODES.NOT_FOUND,
    })
  })

  it("rejects an order id that is not a uuid before reading the order or asking Stripe", async () => {
    await expect(cancelOrder({ data: { orderId: "order-1" } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
    expect(readOrder(PAID_ORDER_ID).status).toBe("processing")
  })

  it("cancels the order its mutation was handed, keyed by the shared cancel key", async () => {
    expect(cancelOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.CANCEL)
    await expect(new MutationObserver(new QueryClient(), cancelOrderMutation).mutate({ orderId: FREE_ORDER_ID })).resolves.toStrictEqual({
      cancelledEmailSent: true,
      ok: true,
      orderId: FREE_ORDER_ID,
    })
  })
})

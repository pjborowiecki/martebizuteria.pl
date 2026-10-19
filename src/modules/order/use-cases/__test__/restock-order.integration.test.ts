import { MutationObserver, QueryClient } from "@tanstack/react-query"
import type Stripe from "stripe"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import {
  charge,
  chargeDisputeClosedEvent,
  chargeRefundedEvent,
  dispute,
} from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ADMIN_ORDER_DETAIL_TAG, ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { cancelOrder } from "~/src/modules/order/use-cases/cancel-order"
import { getAdminOrder } from "~/src/modules/order/use-cases/get-admin-order"
import { refundAdminOrder } from "~/src/modules/order/use-cases/refund-admin-order"
import { restockOrder, restockOrderMutation } from "~/src/modules/order/use-cases/restock-order"

const { audit, catalogInvalidated, sqlite, stripeApi } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    audit: { cancelled: vi.fn(), email: vi.fn(), refund: vi.fn(), refundRequested: vi.fn(), restocked: vi.fn() },
    catalogInvalidated: vi.fn(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stripeApi: {
      refundsCreate: vi.fn<(params: object, options: object) => Promise<{ amount: number; id: string }>>(),
      refundsList:
        vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<{ amount: number; id: string; status: string }[]> }>(),
      sessionsList: vi.fn<(params: object) => Promise<{ data: { id: string; return_url: string }[] }>>(),
      sessionsRetrieve: vi.fn<(id: string) => Promise<{ payment_intent: string; payment_status: "paid" }>>(),
    },
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

  return { ...actual, getRequest: () => new Request(`${SHOP_ORIGIN}/en-US/admin/orders`) }
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
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: {
    checkout: { sessions: { list: stripeApi.sessionsList, retrieve: stripeApi.sessionsRetrieve } },
    refunds: { create: stripeApi.refundsCreate, list: stripeApi.refundsList },
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: () => Promise.resolve(undefined) }))
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

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const PAID_AMOUNT = 38_900

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const STOCK_HELD = { "variant-chain": 3, "variant-ring": 0 }

const STOCK_RETURNED = { "variant-chain": 5, "variant-ring": 1 }

const seedDeliveredOrder = (): void => {
  sqlite.exec(`
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    update inventory set quantity_available = 3 where variant_id = 'variant-chain';
    update inventory set quantity_available = 0 where variant_id = 'variant-ring';
    insert into checkout (id, email, status) values ('checkout-paid', 'ada@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id)
      values ('payment-paid', 'checkout-paid', ${String(PAID_AMOUNT)}, 'stripe', 'succeeded', 'cs_paid');
    insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total)
      values ('${ORDER_ID}', 'checkout-paid', 'payment-paid', 'ada@marte.test', 'MRT-2026-00001', 'completed', 'delivered', ${String(PAID_AMOUNT)});
    insert into order_item (id, order_id, variant_id, quantity, subtotal, title, total, unit_price) values
      ('item-ring', '${ORDER_ID}', 'variant-ring', 1, 18900, 'Ring', 18900, 18900),
      ('item-chain', '${ORDER_ID}', 'variant-chain', 2, 20000, 'Chain', 20000, 10000),
      ('item-retired', '${ORDER_ID}', null, 1, 0, 'Retired piece', 0, 0);
  `)
}

const setOrder = (assignments: string): void => {
  sqlite.prepare(`update "order" set ${assignments} where id = ?`).run(ORDER_ID)
}

const stockRowsSchema = z.array(z.object({ quantity_available: z.number(), variant_id: z.string() }))

const readStock = (): Record<string, number> => {
  const rows = stockRowsSchema.parse(sqlite.prepare(`select variant_id, quantity_available from inventory order by variant_id`).all())

  return Object.fromEntries(rows.map((row) => [row.variant_id, row.quantity_available]))
}

const readOrderStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from "order" where id = ?`).get(ORDER_ID)).status

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`No webhook handler records ${event.type}`)
  }

  await handler(event)
}

const confirmRefundFromStripe = (): Promise<void> =>
  dispatch(chargeRefundedEvent(charge({ amount: PAID_AMOUNT, amountRefunded: PAID_AMOUNT, paymentIntent: "pi_paid" })))

const restockPaidOrder = () => restockOrder({ data: { orderId: ORDER_ID } })

const readAdminOrder = async () => {
  const detail = await getAdminOrder({ data: { orderId: ORDER_ID } })
  if (detail === undefined) {
    throw new Error("The admin order page found no order")
  }

  return detail
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-aura', 'aura', 'published', '{"en-US":"Aura"}');
    insert into product_variant (id, product_id, title) values ('variant-ring', 'product-aura', 'Ring'), ('variant-chain', 'product-aura', 'Chain');
    insert into inventory (id, variant_id, quantity_available) values ('inventory-ring', 'variant-ring', 0), ('inventory-chain', 'variant-chain', 3);
  `)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  seedDeliveredOrder()
  stripeApi.sessionsList.mockResolvedValue({ data: [{ id: "cs_paid", return_url: `${SHOP_ORIGIN}/pl-PL/checkout?success=true` }] })
  stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: "pi_paid", payment_status: "paid" })
  stripeApi.refundsCreate.mockResolvedValue({ amount: PAID_AMOUNT, id: "re_paid" })
  stripeApi.refundsList.mockReturnValue({
    autoPagingToArray: () => Promise.resolve([{ amount: PAID_AMOUNT, id: "re_paid", status: "succeeded" }]),
  })
})

afterAll(() => {
  sqlite.close()
})

describe("a refund made in the Stripe dashboard", () => {
  it("closes the order with its items still out of stock and shows them waiting on the order page", async () => {
    await confirmRefundFromStripe()

    const detail = await readAdminOrder()

    expect(readOrderStatus()).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_HELD)
    expect(catalogInvalidated).not.toHaveBeenCalled()
    expect(detail.restockedAt).toBeUndefined()
    expect(detail.tags).toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  })

  it("returns the items to stock once when the admin says they came back, and clears the flag", async () => {
    await confirmRefundFromStripe()

    await expect(restockPaidOrder()).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
    await expect(restockPaidOrder()).rejects.toMatchObject(INVALID_STATE)

    const detail = await readAdminOrder()

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.restocked).toHaveBeenCalledExactlyOnceWith(ORDER_ID)
    expect(catalogInvalidated).toHaveBeenCalledOnce()
    expect(detail.restockedAt).toBeInstanceOf(Date)
    expect(detail.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  })

  it("returns the items to stock once when two admins confirm it at the same time", async () => {
    await confirmRefundFromStripe()

    const outcomes = await Promise.allSettled([restockPaidOrder(), restockPaidOrder()])

    expect(outcomes.map((outcome) => outcome.status).toSorted()).toStrictEqual(["fulfilled", "rejected"])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.restocked).toHaveBeenCalledOnce()
  })
})

describe("a lost dispute", () => {
  it("closes the order with its items out of stock until the admin returns them", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

    await dispatch(chargeDisputeClosedEvent(dispute({ amount: PAID_AMOUNT, paymentIntent: "pi_paid", status: "lost" })))

    expect(consoleWarn).toHaveBeenCalledOnce()
    expect(readOrderStatus()).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_HELD)

    await restockPaidOrder()

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })
})

describe("the Refund button", () => {
  it("leaves a delivered order's items out of stock when the admin does not say they came back", async () => {
    await refundAdminOrder({ data: { orderId: ORDER_ID, restock: false } })
    await confirmRefundFromStripe()

    expect(readOrderStatus()).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_HELD)
    expect(audit.restocked).not.toHaveBeenCalled()

    const detail = await readAdminOrder()

    expect(detail.tags).toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  })

  it("returns the items the admin says came back at once, and nothing more when Stripe confirms the refund", async () => {
    await refundAdminOrder({ data: { orderId: ORDER_ID, restock: true } })

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(readOrderStatus()).toBe("completed")
    expect(audit.restocked).toHaveBeenCalledExactlyOnceWith(ORDER_ID)

    await confirmRefundFromStripe()
    await confirmRefundFromStripe()

    expect(readOrderStatus()).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)

    const detail = await readAdminOrder()

    expect(detail.tags).not.toContain(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
    await expect(restockPaidOrder()).rejects.toMatchObject(INVALID_STATE)
  })

  it("returns nothing when the admin repeats a refund whose items already came back", async () => {
    await refundAdminOrder({ data: { orderId: ORDER_ID, restock: true } })
    await refundAdminOrder({ data: { orderId: ORDER_ID, restock: true } })

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(audit.restocked).toHaveBeenCalledOnce()
  })
})

describe("restockOrder requests", () => {
  it.each([
    ["processing", "not_fulfilled"],
    ["completed", "delivered"],
  ])("refuses a %s order that is %s, which still has its money", async (status, fulfillmentStatus) => {
    setOrder(`status = '${status}', fulfillment_status = '${fulfillmentStatus}'`)

    await expect(restockPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(readStock()).toStrictEqual(STOCK_HELD)
  })

  it("refuses a cancelled order, whose cancellation already returned its stock", async () => {
    setOrder(`status = 'processing', fulfillment_status = 'not_fulfilled'`)
    await cancelOrder({ data: { orderId: ORDER_ID } })

    await expect(restockPaidOrder()).rejects.toMatchObject(INVALID_STATE)
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("reports a missing order as not found", async () => {
    await expect(restockOrder({ data: { orderId: "0192f3a4-5b6c-7d8e-9fab-cdef01234569" } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: ORDER_ERROR_CODES.NOT_FOUND,
    })
  })

  it("rejects an order id that is not a uuid before reading the order", async () => {
    await expect(restockOrder({ data: { orderId: "order-1" } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })

  it("returns the order its mutation was handed to stock, keyed by the shared restock key", async () => {
    await confirmRefundFromStripe()

    expect(restockOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.RESTOCK)
    await expect(new MutationObserver(new QueryClient(), restockOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })
})

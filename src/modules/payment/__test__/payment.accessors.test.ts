import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createPendingPayment, getPaymentByTransactionId, getPaymentContextByTransactionId } from "~/src/modules/payment/payment.accessors"

const access = vi.hoisted(() => ({
  checkoutFindFirst:
    vi.fn<
      (input: {
        columns?: Record<string, boolean>
        where: SQL | undefined
      }) => Promise<{ createdAt: Date; email: string; status: string; userId: string | null } | undefined>
    >(),
  insertValues: vi.fn<(values: Record<string, unknown>) => Promise<void>>(),
  paymentFindFirst: vi.fn<(input: { columns?: Record<string, boolean>; where: SQL | undefined }) => Promise<unknown>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => ({ values: access.insertValues }),
    query: {
      checkout: { findFirst: access.checkoutFindFirst },
      payment: { findFirst: access.paymentFindFirst },
    },
  },
}))

const dialect = new SQLiteSyncDialect()

const query = (condition: SQL | undefined) => {
  if (condition === undefined) {
    throw new Error("expected a where condition")
  }

  return dialect.sqlToQuery(condition)
}

describe("createPendingPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.insertValues.mockResolvedValue()
  })

  it("records a new payment as pending", async () => {
    await createPendingPayment({
      amount: 120_000,
      checkoutId: "checkout-1",
      currency: "PLN",
      provider: "stripe",
      reservedLines: [{ qty: 1, variantId: "variant-1" }],
      transactionId: "pi_123",
    })

    expect(access.insertValues).toHaveBeenCalledWith({
      amount: 120_000,
      checkoutId: "checkout-1",
      currency: "PLN",
      provider: "stripe",
      reservedLines: [{ qty: 1, variantId: "variant-1" }],
      status: "pending",
      transactionId: "pi_123",
    })
  })
})

describe("getPaymentByTransactionId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.paymentFindFirst.mockResolvedValue(undefined)
  })

  it("looks the payment up by the provider transaction id", async () => {
    await getPaymentByTransactionId("pi_123")

    expect(query(access.paymentFindFirst.mock.calls[0]?.[0].where)).toMatchObject({
      params: ["pi_123"],
      sql: '"payment"."transaction_id" = ?',
    })
  })

  it("reads only the columns the webhook needs", async () => {
    await getPaymentByTransactionId("pi_123")

    expect(access.paymentFindFirst.mock.calls[0]?.[0].columns).toStrictEqual({
      checkoutId: true,
      id: true,
      refundedAmount: true,
      status: true,
    })
  })
})

describe("getPaymentContextByTransactionId", () => {
  const CHECKOUT_OPENED_AT = new Date("2026-10-10T12:00:00.000Z")

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns nothing and never reads the checkout when the payment is unknown", async () => {
    access.paymentFindFirst.mockResolvedValue(undefined)

    await expect(getPaymentContextByTransactionId("pi_unknown")).resolves.toBeUndefined()
    expect(access.checkoutFindFirst).not.toHaveBeenCalled()
  })

  it("returns nothing when the payment points at a checkout that is gone", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1", status: "pending" })
    access.checkoutFindFirst.mockResolvedValue(undefined)

    await expect(getPaymentContextByTransactionId("pi_123")).resolves.toBeUndefined()
  })

  it("joins the payment to its checkout email, owner, opening time and both statuses", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1", status: "succeeded" })
    access.checkoutFindFirst.mockResolvedValue({
      createdAt: CHECKOUT_OPENED_AT,
      email: "shopper@example.com",
      status: "completed",
      userId: "customer-1",
    })

    await expect(getPaymentContextByTransactionId("pi_123")).resolves.toStrictEqual({
      checkoutCreatedAt: CHECKOUT_OPENED_AT,
      checkoutId: "checkout-1",
      checkoutStatus: "completed",
      email: "shopper@example.com",
      paymentStatus: "succeeded",
      userId: "customer-1",
    })
  })

  it("reads the statuses alongside the columns that identify the checkout", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1", status: "pending" })
    access.checkoutFindFirst.mockResolvedValue({
      createdAt: CHECKOUT_OPENED_AT,
      email: "shopper@example.com",
      status: "pending",
      userId: null,
    })

    await getPaymentContextByTransactionId("pi_123")

    expect(access.paymentFindFirst.mock.calls[0]?.[0].columns).toStrictEqual({ checkoutId: true, status: true })
    expect(access.checkoutFindFirst.mock.calls[0]?.[0].columns).toStrictEqual({ createdAt: true, email: true, status: true, userId: true })
  })

  it("reports a guest checkout as having no owner", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1", status: "pending" })
    access.checkoutFindFirst.mockResolvedValue({
      createdAt: CHECKOUT_OPENED_AT,
      email: "guest@example.com",
      status: "pending",
      userId: null,
    })

    const context = await getPaymentContextByTransactionId("pi_123")

    expect(context?.userId).toBeUndefined()
  })

  it("scopes the checkout lookup to the id the payment carries", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1", status: "pending" })
    access.checkoutFindFirst.mockResolvedValue({
      createdAt: CHECKOUT_OPENED_AT,
      email: "shopper@example.com",
      status: "pending",
      userId: null,
    })

    await getPaymentContextByTransactionId("pi_123")

    expect(query(access.checkoutFindFirst.mock.calls[0]?.[0].where)).toMatchObject({
      params: ["checkout-1"],
      sql: '"checkout"."id" = ?',
    })
  })
})

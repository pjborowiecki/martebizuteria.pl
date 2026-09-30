import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createPendingPayment,
  getPaymentByTransactionId,
  getPaymentContextByTransactionId,
  repointPayment,
} from "~/src/modules/payment/payment.accessors"

const access = vi.hoisted(() => ({
  checkoutFindFirst: vi.fn<(input: { where: SQL | undefined }) => Promise<{ email: string; userId: string | null } | undefined>>(),
  insertValues: vi.fn<(values: Record<string, unknown>) => Promise<void>>(),
  paymentFindFirst: vi.fn<(input: { columns?: Record<string, boolean>; where: SQL | undefined }) => Promise<unknown>>(),
  set: vi.fn(),
  where: vi.fn<(condition: SQL | undefined) => Promise<void>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => ({ values: access.insertValues }),
    query: {
      checkout: { findFirst: access.checkoutFindFirst },
      payment: { findFirst: access.paymentFindFirst },
    },
    update: () => ({ set: access.set }),
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
      transactionId: "pi_123",
    })

    expect(access.insertValues).toHaveBeenCalledWith({
      amount: 120_000,
      checkoutId: "checkout-1",
      currency: "PLN",
      provider: "stripe",
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns nothing and never reads the checkout when the payment is unknown", async () => {
    access.paymentFindFirst.mockResolvedValue(undefined)

    await expect(getPaymentContextByTransactionId("pi_unknown")).resolves.toBeUndefined()
    expect(access.checkoutFindFirst).not.toHaveBeenCalled()
  })

  it("returns nothing when the payment points at a checkout that is gone", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1" })
    access.checkoutFindFirst.mockResolvedValue(undefined)

    await expect(getPaymentContextByTransactionId("pi_123")).resolves.toBeUndefined()
  })

  it("joins the payment to its checkout email and owner", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1" })
    access.checkoutFindFirst.mockResolvedValue({ email: "shopper@example.com", userId: "customer-1" })

    await expect(getPaymentContextByTransactionId("pi_123")).resolves.toStrictEqual({
      checkoutId: "checkout-1",
      email: "shopper@example.com",
      userId: "customer-1",
    })
  })

  it("reports a guest checkout as having no owner", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1" })
    access.checkoutFindFirst.mockResolvedValue({ email: "guest@example.com", userId: null })

    const context = await getPaymentContextByTransactionId("pi_123")

    expect(context?.userId).toBeUndefined()
  })

  it("scopes the checkout lookup to the id the payment carries", async () => {
    access.paymentFindFirst.mockResolvedValue({ checkoutId: "checkout-1" })
    access.checkoutFindFirst.mockResolvedValue({ email: "shopper@example.com", userId: null })

    await getPaymentContextByTransactionId("pi_123")

    expect(query(access.checkoutFindFirst.mock.calls[0]?.[0].where)).toMatchObject({
      params: ["checkout-1"],
      sql: '"checkout"."id" = ?',
    })
  })
})

describe("repointPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.where.mockResolvedValue()
    access.set.mockReturnValue({ where: access.where })
  })

  it("moves the payment onto the new provider transaction and amount", async () => {
    await repointPayment({ amount: 150_000, newTransactionId: "pi_new", oldTransactionId: "pi_old" })

    expect(access.set).toHaveBeenCalledWith({ amount: 150_000, transactionId: "pi_new" })
  })

  it("only touches the row that still carries the old transaction id", async () => {
    await repointPayment({ amount: 150_000, newTransactionId: "pi_new", oldTransactionId: "pi_old" })

    expect(query(access.where.mock.calls[0]?.[0])).toMatchObject({
      params: ["pi_old"],
      sql: '"payment"."transaction_id" = ?',
    })
  })
})

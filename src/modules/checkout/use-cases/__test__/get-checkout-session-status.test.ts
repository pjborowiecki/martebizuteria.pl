import { QueryClient, skipToken } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"

const captured = vi.hoisted((): { middleware: unknown[]; validate?: (input: unknown) => unknown } => ({ middleware: [] }))

const mocked = vi.hoisted(() => ({
  getPaymentContextByTransactionId: vi.fn(),
  getRequestSession: vi.fn(),
  releaseExpiredCheckoutSession: vi.fn(),
  retrieve: vi.fn(),
  withRateLimit: vi.fn((kind: string, limit: object) => ({ kind, limit })),
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      middleware: (middleware: unknown[]) => {
        captured.middleware = middleware

        return builder
      },
      validator: (validate: (input: unknown) => unknown) => {
        captured.validate = validate

        return builder
      },
    }

    return builder
  },
}))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { CHECKOUT: { max: 10, window: 60 } },
  withRateLimit: mocked.withRateLimit,
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: mocked.getRequestSession }))
vi.mock("~/src/integrations/stripe/stripe.actions.server", () => ({
  releaseExpiredCheckoutSession: mocked.releaseExpiredCheckoutSession,
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { retrieve: mocked.retrieve } } } }))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))

const { checkoutSessionStatusQuery, getCheckoutSessionStatus } =
  await import("~/src/modules/checkout/use-cases/get-checkout-session-status")

const paymentContext = (overrides: Record<string, unknown> = {}) => ({
  checkoutId: "checkout-1",
  checkoutStatus: "pending",
  email: "anna@example.com",
  paymentStatus: "pending",
  userId: undefined,
  ...overrides,
})

const statusOf = (sessionId: string) => getCheckoutSessionStatus({ data: { sessionId } })

const AWAITING_BLIK_APPROVAL = { next_action: { type: "blik_authorize" }, status: "requires_action" }

beforeEach(() => {
  vi.clearAllMocks()
  mocked.getPaymentContextByTransactionId.mockResolvedValue(paymentContext())
  mocked.getRequestSession.mockResolvedValue(null)
  mocked.releaseExpiredCheckoutSession.mockResolvedValue(undefined)
  mocked.retrieve.mockResolvedValue({ id: "cs_held", status: "open" })
})

describe("getCheckoutSessionStatus input", () => {
  it("limits each client address to the checkout rate, in a bucket of its own", () => {
    expect(captured.middleware).toStrictEqual([{ kind: "checkout-status", limit: { max: 10, window: 60 } }])
  })

  it("accepts a Checkout Session id and trims it", () => {
    expect(captured.validate?.({ sessionId: "  cs_held  " })).toStrictEqual({ sessionId: "cs_held" })
  })

  it.each([{ sessionId: "" }, { sessionId: "   " }, { sessionId: `cs_${"x".repeat(253)}` }, {}])("refuses %o", (input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("getCheckoutSessionStatus without asking Stripe", () => {
  it("reports a session no payment carries as closed, as for a session that was already replaced", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(undefined)

    await expect(statusOf("cs_replaced")).resolves.toBe("closed")
    expect(mocked.getPaymentContextByTransactionId).toHaveBeenCalledWith("cs_replaced")
    expect(mocked.retrieve).not.toHaveBeenCalled()
  })

  it("reports a released checkout as closed", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(paymentContext({ checkoutStatus: "failed", paymentStatus: "failed" }))

    await expect(statusOf("cs_expired")).resolves.toBe("closed")
    expect(mocked.retrieve).not.toHaveBeenCalled()
  })

  it.each(["succeeded", "refunded"])(
    "reports a guest checkout whose payment %s as complete to whoever holds its id",
    async (paymentStatus) => {
      mocked.getPaymentContextByTransactionId.mockResolvedValue(paymentContext({ checkoutStatus: "completed", paymentStatus }))

      await expect(statusOf("cs_paid")).resolves.toBe("complete")
      expect(mocked.retrieve).not.toHaveBeenCalled()
    },
  )

  it.each([
    { caller: "that account", session: { user: { id: "user-1" } } },
    { caller: "another account", session: { user: { id: "user-2" } } },
    { caller: "a browser the bank returned to signed out", session: null },
  ])("reports an account's paid checkout as complete to $caller, as its confirmation page would", async ({ session }) => {
    mocked.getRequestSession.mockResolvedValue(session)
    mocked.getPaymentContextByTransactionId.mockResolvedValue(paymentContext({ paymentStatus: "succeeded", userId: "user-1" }))

    await expect(statusOf("cs_paid")).resolves.toBe("complete")
    expect(mocked.retrieve).not.toHaveBeenCalled()
  })
})

describe("getCheckoutSessionStatus for an account's checkout asked about by whoever holds its id", () => {
  beforeEach(() => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(paymentContext({ userId: "user-1" }))
  })

  it("reports a session Stripe completed before its webhook as complete to a browser that is not signed in", async () => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "paid", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("complete")
    expect(mocked.getRequestSession).not.toHaveBeenCalled()
  })

  it("lets that account continue a session Stripe still offers for payment", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1" } })

    await expect(statusOf("cs_held")).resolves.toBe("open")
  })

  it.each([
    { caller: "another account", session: { user: { id: "user-2" } } },
    { caller: "a signed-out browser", session: null },
  ])("tells $caller only that an open session cannot be paid from there, as for an unknown session", async ({ session }) => {
    mocked.getRequestSession.mockResolvedValue(session)

    await expect(statusOf("cs_held")).resolves.toBe("closed")
  })

  it("tells that account its session is waiting for the bank", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1" } })
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_intent: AWAITING_BLIK_APPROVAL, status: "open" })

    await expect(statusOf("cs_held")).resolves.toBe("processing")
  })

  it("tells that account its completed session is still settling", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1" } })
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "unpaid", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("processing")
  })

  it("tells another account nothing about a completed session still settling, as for an unknown session", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-2" } })
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "unpaid", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("closed")
  })

  it("tells another account nothing about a payment under way, as for an unknown session", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-2" } })
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_intent: AWAITING_BLIK_APPROVAL, status: "open" })

    await expect(statusOf("cs_held")).resolves.toBe("closed")
  })
})

describe("getCheckoutSessionStatus for a payment still pending", () => {
  it("reports a session Stripe completed as complete before its webhook has recorded the order", async () => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "paid", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("complete")
    expect(mocked.retrieve).toHaveBeenCalledWith("cs_held", { expand: ["payment_intent"] })
    expect(mocked.releaseExpiredCheckoutSession).not.toHaveBeenCalled()
  })

  it("reports a completed session whose asynchronous payment has not settled as processing, so the page waits for the bank instead of confirming it", async () => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "unpaid", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("processing")
    expect(mocked.releaseExpiredCheckoutSession).not.toHaveBeenCalled()
  })

  it("reports a completed session that needed no payment as complete", async () => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_status: "no_payment_required", status: "complete" })

    await expect(statusOf("cs_held")).resolves.toBe("complete")
  })

  it("reports a guest's session Stripe still offers for payment as open to whoever holds its id", async () => {
    await expect(statusOf("cs_held")).resolves.toBe("open")
    expect(mocked.releaseExpiredCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.getRequestSession).not.toHaveBeenCalled()
  })

  it.each([
    { payment: "a BLIK payment waiting for approval in the banking app", paymentIntent: AWAITING_BLIK_APPROVAL },
    { payment: "a payment the bank is still processing", paymentIntent: { next_action: null, status: "processing" } },
  ])("reports a guest's open session with $payment as processing, so the page waits instead of replacing it", async ({ paymentIntent }) => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", payment_intent: paymentIntent, status: "open" })

    await expect(statusOf("cs_held")).resolves.toBe("processing")
    expect(mocked.getRequestSession).not.toHaveBeenCalled()
  })

  it("reports a session whose BLIK payment the bank declined as open again, so the shopper can pay another way", async () => {
    mocked.retrieve.mockResolvedValue({
      id: "cs_held",
      payment_intent: { next_action: null, status: "requires_payment_method" },
      status: "open",
    })

    await expect(statusOf("cs_held")).resolves.toBe("open")
  })

  it("releases the stock of a session Stripe expired before its webhook arrived and reports it closed", async () => {
    const expired = { id: "cs_held", metadata: { items: "[]" }, status: "expired" }
    mocked.retrieve.mockResolvedValue(expired)

    await expect(statusOf("cs_held")).resolves.toBe("closed")
    expect(mocked.releaseExpiredCheckoutSession).toHaveBeenCalledExactlyOnceWith(expired)
  })

  it("reports a session without a status as closed and releases nothing", async () => {
    mocked.retrieve.mockResolvedValue({ id: "cs_held", status: null })

    await expect(statusOf("cs_held")).resolves.toBe("closed")
    expect(mocked.releaseExpiredCheckoutSession).not.toHaveBeenCalled()
  })
})

describe("checkoutSessionStatusQuery", () => {
  it("asks nothing while the browser holds no session", () => {
    expect(checkoutSessionStatusQuery(undefined)).toMatchObject({
      queryFn: skipToken,
      queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, undefined],
    })
  })

  it("asks once per visit to the checkout and keeps the answer only while the page shows it", () => {
    expect(checkoutSessionStatusQuery("cs_held")).toMatchObject({
      gcTime: 0,
      queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_held"],
      retry: 2,
      staleTime: "static",
    })
  })

  it("asks the server about the session it is keyed by", async () => {
    await expect(new QueryClient().query(checkoutSessionStatusQuery("cs_held"))).resolves.toBe("open")
    expect(mocked.getPaymentContextByTransactionId).toHaveBeenCalledWith("cs_held")
  })
})

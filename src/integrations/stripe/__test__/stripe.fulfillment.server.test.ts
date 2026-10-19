import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  fulfillCheckout: vi.fn<(input: object) => Promise<string | undefined>>(),
  recordOrderPaymentCapturedAudit: vi.fn(),
  retrieve: vi.fn<(sessionId: string) => Promise<Stripe.Checkout.Session>>(),
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleBackgroundWork: vi.fn<(task: Promise<unknown>) => void>(),
  scheduleProductCatalogInvalidation: vi.fn(),
  sendNewOrderEmail: vi.fn<(orderId: string, returnUrl: string | null | undefined) => Promise<boolean>>(),
  sendOrderConfirmationEmail: vi.fn<(session: Stripe.Checkout.Session, orderId: string) => Promise<boolean>>(),
}))

vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { retrieve: mocked.retrieve } } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: mocked.scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation: mocked.scheduleProductCatalogInvalidation,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordOrderPaymentCapturedAudit: mocked.recordOrderPaymentCapturedAudit,
}))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout: mocked.fulfillCheckout }))
vi.mock("~/src/modules/checkout/checkout.session-lines.server", async () => {
  const { parseCheckoutSessionFulfillmentLines } = await import("~/src/modules/checkout/checkout-metadata.zod")

  return {
    readCheckoutSessionLines: (session: Parameters<typeof parseCheckoutSessionFulfillmentLines>[0]) =>
      Promise.resolve(parseCheckoutSessionFulfillmentLines(session)),
  }
})
vi.mock("~/src/modules/order/use-cases/send-new-order-email.server", () => ({ sendNewOrderEmail: mocked.sendNewOrderEmail }))
vi.mock("~/src/modules/order/use-cases/send-order-confirmation-email.server", () => ({
  sendOrderConfirmationEmail: mocked.sendOrderConfirmationEmail,
}))
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork: mocked.scheduleBackgroundWork }))

const { fulfillReturnedCheckoutSession } = await import("~/src/integrations/stripe/stripe.fulfillment.server")

const { checkoutSession } = await import("./fixtures/stripe-webhook-events")

const PAID_AMOUNT = 25_399

const NECKLACE_LINE = { price: PAID_AMOUNT, qty: 1, title: "Naszyjnik Luna", variantId: "variant-luna" }

const returnedSession = (overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session => ({
  ...checkoutSession({
    amountTotal: PAID_AMOUNT,
    customerEmail: "ada@marte.test",
    id: "cs_test_returned",
    metadata: { checkoutId: "checkout-1", items: JSON.stringify([NECKLACE_LINE]), locale: "pl-PL" },
    paymentIntent: "pi_test_returned",
  }),
  ...overrides,
})

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  mocked.fulfillCheckout.mockResolvedValue("order-1")
  mocked.retrieve.mockResolvedValue(returnedSession())
  mocked.sendNewOrderEmail.mockResolvedValue(true)
  mocked.sendOrderConfirmationEmail.mockResolvedValue(true)
})

describe("fulfillReturnedCheckoutSession for a session Stripe reports paid", () => {
  it("places the order from the session it retrieves itself", async () => {
    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.retrieve).toHaveBeenCalledExactlyOnceWith("cs_test_returned")
    expect(mocked.fulfillCheckout).toHaveBeenCalledExactlyOnceWith({
      currency: "PLN",
      lines: [NECKLACE_LINE],
      locale: "pl-PL",
      paidAmount: PAID_AMOUNT,
      transactionId: "cs_test_returned",
    })
  })

  it("hands on the delivery charge and the discount the session was priced with", async () => {
    mocked.retrieve.mockResolvedValue(
      returnedSession({
        metadata: { discountCode: "SPRING", discountTotal: "2490", items: JSON.stringify([NECKLACE_LINE]), shippingTotal: "1500" },
      }),
    )

    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.fulfillCheckout).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ discountTotal: 2490, shippingTotal: 1500 }))
  })

  it("records the captured payment and refreshes the admin and the catalogue as the webhook would", async () => {
    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.recordOrderPaymentCapturedAudit).toHaveBeenCalledExactlyOnceWith("order-1", {
      detail: "253,99 PLN",
      resourceId: "order-1",
    })
    expect(mocked.scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })

  it("sends both order emails in the background instead of keeping the shopper's page waiting for them", async () => {
    const delivered = Promise.withResolvers<boolean>()
    mocked.sendOrderConfirmationEmail.mockReturnValue(delivered.promise)

    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.sendOrderConfirmationEmail).toHaveBeenCalledExactlyOnceWith(returnedSession(), "order-1")
    expect(mocked.sendNewOrderEmail).toHaveBeenCalledExactlyOnceWith("order-1", returnedSession().return_url)
    expect(mocked.scheduleBackgroundWork).toHaveBeenCalledOnce()
    delivered.resolve(true)
    await expect(mocked.scheduleBackgroundWork.mock.calls[0]?.[0]).resolves.toStrictEqual([true, true])
  })

  it("places the order of a session that needs no payment", async () => {
    mocked.retrieve.mockResolvedValue(returnedSession({ payment_status: "no_payment_required" }))

    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.fulfillCheckout).toHaveBeenCalledOnce()
  })
})

describe("fulfillReturnedCheckoutSession when the webhook or another tab got there first", () => {
  it("announces nothing for an order another call placed", async () => {
    mocked.fulfillCheckout.mockResolvedValue(undefined)

    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
    expect(mocked.scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(mocked.sendOrderConfirmationEmail).not.toHaveBeenCalled()
    expect(mocked.sendNewOrderEmail).not.toHaveBeenCalled()
    expect(mocked.scheduleBackgroundWork).not.toHaveBeenCalled()
  })
})

describe("fulfillReturnedCheckoutSession for a session Stripe does not report paid", () => {
  it.each([
    { session: { payment_status: "unpaid" as const }, why: "a delayed-notification payment that has not settled" },
    { session: { payment_status: "unpaid" as const, status: "open" as const }, why: "a session still open for payment" },
    {
      session: { payment_status: "no_payment_required" as const, status: "open" as const },
      why: "an open session that would cost nothing",
    },
    { session: { payment_status: "unpaid" as const, status: "expired" as const }, why: "an expired session" },
  ])("leaves $why to the webhook", async ({ session }) => {
    mocked.retrieve.mockResolvedValue(returnedSession(session))

    await fulfillReturnedCheckoutSession("cs_test_returned")

    expect(mocked.fulfillCheckout).not.toHaveBeenCalled()
    expect(mocked.recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
  })
})

describe("fulfillReturnedCheckoutSession when the order cannot be written", () => {
  it("logs the failure and leaves recording, alerting and retrying to the webhook", async () => {
    const failure = new Error("D1_ERROR: Network connection lost.")
    mocked.fulfillCheckout.mockRejectedValue(failure)

    await expect(fulfillReturnedCheckoutSession("cs_test_returned")).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith("Paid Checkout Session cs_test_returned created no order from its return page:", failure)
    expect(mocked.recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
    expect(mocked.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it("passes on a failure to reach Stripe, so the page asks again", async () => {
    mocked.retrieve.mockRejectedValue(new Error("Stripe is unreachable"))

    await expect(fulfillReturnedCheckoutSession("cs_test_returned")).rejects.toThrow("Stripe is unreachable")
    expect(mocked.fulfillCheckout).not.toHaveBeenCalled()
  })
})

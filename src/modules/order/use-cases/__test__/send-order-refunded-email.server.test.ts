import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-refunded.json"
import polishCopy from "~/messages/pl-PL/emails.order-refunded.json"
import { type OrderRefunded } from "~/src/presentation/emails/order-refunded"

type OrderRefundedElement = ReactElement<ComponentProps<typeof OrderRefunded>>

const { getOrderForRefundEmail, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  getOrderForRefundEmail: vi.fn(),
  loadNamespace: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  sendEmail:
    vi.fn<
      (options: {
        readonly idempotencyKey?: string
        readonly react: OrderRefundedElement
        readonly subject: string
        readonly to: string
      }) => Promise<string | undefined>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForRefundEmail }))

import { sendOrderRefundedEmail } from "~/src/modules/order/use-cases/send-order-refunded-email.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const ORDER_ID = "order-abcdef12"

const ORDER_TOTAL = 39_899

const RETURN_URL = "https://preview.martebizuteria.pl/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}"

const PARTIAL_REFUND = { amount: 5000, fullyRefunded: false, orderId: ORDER_ID, refundId: "re_partial", refundedTotal: 8000 }

const REFUND_DELIVERY = {
  idempotencyKey: `order-refunded/${ORDER_ID}/re_partial`,
  orderEmail: { amount: 5000, fullyRefunded: false, kind: "order-refunded", refundId: "re_partial", refundedTotal: 8000 },
}

const orderRow = {
  currencyCode: "PLN",
  email: "anna@example.com",
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  recipient: "anna@example.com",
  total: ORDER_TOTAL,
  userId: "user-1",
}

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no refund email was sent")
  }

  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  getOrderForRefundEmail.mockResolvedValue(orderRow)
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("sendOrderRefundedEmail", () => {
  it("emails the customer in the locale the order was placed in", async () => {
    await sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)

    expect(getOrderForRefundEmail).toHaveBeenCalledWith(ORDER_ID)
    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-refunded" })
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().subject).toBe(englishCopy.subject)
  })

  it("states the amount of this refund against the order total", async () => {
    await sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)

    expect(sentEmail().react.props).toMatchObject({
      currency: "PLN",
      fullyRefunded: false,
      orderNumber: "MRT-2026-00042",
      orderTotal: ORDER_TOTAL,
      refundedAmount: 5000,
    })
  })

  it("falls back to the default locale when the order carries no locale", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, metadata: null })
    loadNamespace.mockResolvedValue(polishCopy)

    await sendOrderRefundedEmail(
      { amount: ORDER_TOTAL, fullyRefunded: true, orderId: ORDER_ID, refundId: "re_full", refundedTotal: ORDER_TOTAL },
      RETURN_URL,
    )

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-refunded" })
    expect(sentEmail().subject).toBe(polishCopy.subject)
  })

  it("links the order on the deployment the checkout returned to", async () => {
    await sendOrderRefundedEmail(PARTIAL_REFUND, "http://127.0.0.1:3000/en-US/checkout?success=true")

    const html = await render(sentEmail().react)

    expect(html).toContain(`href="http://127.0.0.1:3000/en-US/account/orders/${ORDER_ID}"`)
  })

  it("invites a guest to create an account instead", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, userId: null })

    await sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)

    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "https://preview.martebizuteria.pl/en-US/auth/sign-up",
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("records a successful send against the order and reports it", async () => {
    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order refunded → anna@example.com",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: false,
    })
  })

  it("records the refusal reported by the email transport", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order refunded → anna@example.com",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: true,
    })
  })

  it("records a refund email whose session has no return URL to link it to", async () => {
    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, undefined)).resolves.toBe(false)

    expect(getOrderForRefundEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The Stripe session has no return URL to link the email to",
      label: "Order refunded",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: true,
    })
  })

  it("records a refund email whose session returned to a host no deployment serves", async () => {
    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, "https://attacker.example/en-US/checkout")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(`Order refunded for order ${ORDER_ID} could not be prepared:`, expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "FORBIDDEN",
      label: "Order refunded",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: true,
    })
  })

  it("records a refund email that has no order to go out for", async () => {
    getOrderForRefundEmail.mockResolvedValue(undefined)

    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order refunded",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: true,
    })
  })

  it("records a refund email that has no recipient", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, email: " ", recipient: " " })

    await expect(sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order has no email address",
      label: "Order refunded",
      metadata: REFUND_DELIVERY,
      orderId: ORDER_ID,
      willRetry: true,
    })
  })
})

describe("sendOrderRefundedEmail idempotency key", () => {
  it("keys each refund's email by its Stripe refund, so a refund issued again after one failed reaches the customer", async () => {
    await sendOrderRefundedEmail(PARTIAL_REFUND, RETURN_URL)
    await sendOrderRefundedEmail({ ...PARTIAL_REFUND, refundId: "re_reissued" }, RETURN_URL)

    expect(sendEmail.mock.calls.map(([options]) => options.idempotencyKey)).toStrictEqual([
      `order-refunded/${ORDER_ID}/re_partial`,
      `order-refunded/${ORDER_ID}/re_reissued`,
    ])
  })

  it("keeps the total-based key of a refund email recorded before emails named their Stripe refund, so resending it settles that record", async () => {
    await sendOrderRefundedEmail({ ...PARTIAL_REFUND, refundId: undefined }, RETURN_URL)

    expect(sentEmail().idempotencyKey).toBe(`order-refunded/${ORDER_ID}/8000`)
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          idempotencyKey: `order-refunded/${ORDER_ID}/8000`,
          orderEmail: { amount: 5000, fullyRefunded: false, kind: "order-refunded", refundId: undefined, refundedTotal: 8000 },
        },
      }),
    )
  })
})

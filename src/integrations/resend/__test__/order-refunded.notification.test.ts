import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

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
      (options: { readonly react: OrderRefundedElement; readonly subject: string; readonly to: string }) => Promise<string | undefined>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForRefundEmail }))

import { notifyOrderRefunded } from "~/src/integrations/resend/order-refunded.notification.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const ORDER_ID = "order-abcdef12"

const ORDER_TOTAL = 39_899

const RETURN_URL = "https://preview.martebizuteria.pl/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}"

const PARTIAL_REFUND = { amount: 5000, fullyRefunded: false, orderId: ORDER_ID }

const orderRow = {
  currencyCode: "PLN",
  email: "anna@example.com",
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
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
  getOrderForRefundEmail.mockResolvedValue(orderRow)
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

describe("notifyOrderRefunded", () => {
  it("emails the customer in the locale the order was placed in", async () => {
    await notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)

    expect(getOrderForRefundEmail).toHaveBeenCalledWith(ORDER_ID)
    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-refunded" })
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().subject).toBe(englishCopy.subject)
  })

  it("states the amount of this refund against the order total", async () => {
    await notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)

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

    await notifyOrderRefunded({ amount: ORDER_TOTAL, fullyRefunded: true, orderId: ORDER_ID }, RETURN_URL)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-refunded" })
    expect(sentEmail().subject).toBe(polishCopy.subject)
  })

  it("links the order on the deployment the checkout returned to", async () => {
    await notifyOrderRefunded(PARTIAL_REFUND, "http://127.0.0.1:3000/en-US/checkout?success=true")

    const html = await render(sentEmail().react)

    expect(html).toContain(`href="http://127.0.0.1:3000/en-US/account/orders/${ORDER_ID}"`)
  })

  it("invites a guest to create an account instead", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, userId: null })

    await notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)

    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "https://preview.martebizuteria.pl/en-US/auth/sign-up",
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("records a successful send against the order and reports it", async () => {
    await expect(notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order refunded → anna@example.com",
      orderId: ORDER_ID,
    })
  })

  it("records the refusal reported by the email transport", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    await expect(notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order refunded → anna@example.com",
      orderId: ORDER_ID,
    })
  })

  it("records a refund email whose session has no return URL to link it to", async () => {
    await expect(notifyOrderRefunded(PARTIAL_REFUND, undefined)).resolves.toBe(false)

    expect(getOrderForRefundEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The Stripe session has no return URL to link the email to",
      label: "Order refunded",
      orderId: ORDER_ID,
    })
  })

  it("records a refund email whose session returned to a host no deployment serves", async () => {
    await expect(notifyOrderRefunded(PARTIAL_REFUND, "https://attacker.example/en-US/checkout")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(`Order refunded for order ${ORDER_ID} could not be prepared:`, expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ failure: "FORBIDDEN", label: "Order refunded", orderId: ORDER_ID })
  })

  it("records a refund email that has no order to go out for", async () => {
    getOrderForRefundEmail.mockResolvedValue(undefined)

    await expect(notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order refunded",
      orderId: ORDER_ID,
    })
  })

  it("records a refund email that has no recipient", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, email: " " })

    await expect(notifyOrderRefunded(PARTIAL_REFUND, RETURN_URL)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order has no email address",
      label: "Order refunded",
      orderId: ORDER_ID,
    })
  })
})

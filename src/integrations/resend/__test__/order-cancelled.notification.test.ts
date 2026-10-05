import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-cancelled.json"
import polishCopy from "~/messages/pl-PL/emails.order-cancelled.json"
import { type OrderCancelled } from "~/src/presentation/emails/order-cancelled"

type OrderCancelledElement = ReactElement<ComponentProps<typeof OrderCancelled>>

const { getOrderForRefundEmail, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  getOrderForRefundEmail: vi.fn(),
  loadNamespace: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  sendEmail:
    vi.fn<
      (options: { readonly react: OrderCancelledElement; readonly subject: string; readonly to: string }) => Promise<string | undefined>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForRefundEmail }))

import { notifyOrderCancelled } from "~/src/integrations/resend/order-cancelled.notification.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const ORDER_ID = "order-abcdef12"

const ORIGIN = "https://preview.martebizuteria.pl"

const REFUNDED_AMOUNT = 39_899

const orderRow = {
  currencyCode: "PLN",
  email: "anna@example.com",
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  total: REFUNDED_AMOUNT,
  userId: "user-1",
}

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no cancellation email was sent")
  }

  return call[0]
}

const cancel = (): Promise<boolean> => notifyOrderCancelled({ orderId: ORDER_ID, refundedAmount: REFUNDED_AMOUNT }, ORIGIN)

beforeEach(() => {
  vi.clearAllMocks()
  getOrderForRefundEmail.mockResolvedValue(orderRow)
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

describe("notifyOrderCancelled", () => {
  it("emails the customer in the locale the order was placed in", async () => {
    await cancel()

    expect(getOrderForRefundEmail).toHaveBeenCalledWith(ORDER_ID)
    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-cancelled" })
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().subject).toBe(englishCopy.subject)
  })

  it("names the order and the amount the cancellation refunded", async () => {
    await cancel()

    expect(sentEmail().react.props).toMatchObject({ currency: "PLN", orderNumber: "MRT-2026-00042", refundedAmount: REFUNDED_AMOUNT })
  })

  it("tells the customer of a free order that nothing is refunded", async () => {
    await notifyOrderCancelled({ orderId: ORDER_ID, refundedAmount: undefined }, ORIGIN)

    expect(sentEmail().react.props.refundedAmount).toBeUndefined()
  })

  it("falls back to the default locale when the order carries no locale", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, metadata: null })
    loadNamespace.mockResolvedValue(polishCopy)

    await cancel()

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-cancelled" })
    expect(sentEmail().subject).toBe(polishCopy.subject)
  })

  it("links a customer with an account to the order on the deployment the admin cancelled it from", async () => {
    await notifyOrderCancelled({ orderId: ORDER_ID, refundedAmount: REFUNDED_AMOUNT }, "http://127.0.0.1:3000")

    const html = await render(sentEmail().react)

    expect(html).toContain(`href="http://127.0.0.1:3000/en-US/account/orders/${ORDER_ID}"`)
  })

  it("invites a guest to create an account instead", async () => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, userId: null })

    await cancel()

    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: `${ORIGIN}/en-US/auth/sign-up`,
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("records a successful send against the order and reports it", async () => {
    await expect(cancel()).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order cancelled → anna@example.com",
      orderId: ORDER_ID,
    })
  })

  it("records the refusal reported by the email transport and reports the send as failed", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    await expect(cancel()).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order cancelled → anna@example.com",
      orderId: ORDER_ID,
    })
  })

  it("records a cancellation email that has no order to go out for", async () => {
    getOrderForRefundEmail.mockResolvedValue(undefined)

    await expect(cancel()).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order cancelled",
      orderId: ORDER_ID,
    })
  })

  it.each([[""], ["   "]])("records a cancellation email that has no recipient when the order email is %j", async (email) => {
    getOrderForRefundEmail.mockResolvedValue({ ...orderRow, email })

    await expect(cancel()).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order has no email address",
      label: "Order cancelled",
      orderId: ORDER_ID,
    })
  })

  it("records a cancellation email that could not be prepared against the order instead of throwing", async () => {
    getOrderForRefundEmail.mockRejectedValue(new Error("D1_ERROR: no such table"))

    await expect(cancel()).resolves.toBe(false)

    expect(consoleError).toHaveBeenCalledWith(`Order cancelled for order ${ORDER_ID} could not be prepared:`, expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "D1_ERROR: no such table",
      label: "Order cancelled",
      orderId: ORDER_ID,
    })
  })
})

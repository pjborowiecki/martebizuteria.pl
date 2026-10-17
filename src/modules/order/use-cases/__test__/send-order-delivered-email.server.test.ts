import { type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-delivered.json"
import polishCopy from "~/messages/pl-PL/emails.order-delivered.json"

const { getOrderForProgressEmail, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  getOrderForProgressEmail: vi.fn(),
  loadNamespace: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  sendEmail:
    vi.fn<
      (options: {
        readonly idempotencyKey?: string
        readonly react: ReactElement
        readonly subject: string
        readonly to: string
      }) => Promise<string | undefined>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/store-setting/store-setting.accessors", async () => {
  const { TEST_STORED_SELLER_DETAILS } = await import("~/src/platform/testing/mocks/seller-details")

  return { readSellerDetails: () => Promise.resolve(TEST_STORED_SELLER_DETAILS) }
})
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForProgressEmail }))

import { sendOrderDeliveredEmail } from "~/src/modules/order/use-cases/send-order-delivered-email.server"

const ORIGIN = "https://preview.martebizuteria.pl"

const orderRow = {
  deliveryMethod: { names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" }, type: "courier" },
  email: "anna@example.com",
  id: "order-abcdef12",
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  recipient: "anna@example.com",
  userId: "user-1",
}

const DELIVERED_DELIVERY = { idempotencyKey: "order-delivered/order-abcdef12", orderEmail: { kind: "order-delivered" } }

const sentText = (): Promise<string> => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no thank-you email was sent")
  }

  return render(payload.react, { plainText: true })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("sendOrderDeliveredEmail", () => {
  it("records an email that has no order to go out for", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce(undefined)

    await expect(sendOrderDeliveredEmail("order-abcdef12", ORIGIN)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order delivered",
      metadata: DELIVERED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it("records an email that has no recipient", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce({ ...orderRow, email: "  ", recipient: "  " })

    await expect(sendOrderDeliveredEmail("order-abcdef12", ORIGIN)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(expect.objectContaining({ failure: "The order has no email address" }))
  })

  it("thanks the shopper in the order's language with links on the shop the admin works in", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce(orderRow)

    await expect(sendOrderDeliveredEmail("order-abcdef12", ORIGIN)).resolves.toBe(true)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-delivered" })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: DELIVERED_DELIVERY.idempotencyKey, subject: englishCopy.subject, to: "anna@example.com" }),
    )
    const text = await sentText()
    expect(text).toContain(`${englishCopy.care.more} ${ORIGIN}/en-US/faq`)
    expect(text).toContain(`${englishCopy.returns.withdrawal} ${ORIGIN}/en-US/withdraw-from-contract?order=MRT-2026-00042`)
    expect(text).toContain(`${englishCopy.viewOrderCta} ${ORIGIN}/en-US/account/orders/order-abcdef12`)
    expect(text).toContain("sklep@marte.test or call +48 600 100 200")
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order delivered → anna@example.com",
      metadata: DELIVERED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: false,
    })
  })

  it("writes in Polish by default and invites a guest to create an account", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce({ ...orderRow, metadata: null, userId: null })
    loadNamespace.mockResolvedValueOnce(polishCopy)

    await sendOrderDeliveredEmail("order-abcdef12", ORIGIN)
    const text = await sentText()

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-delivered" })
    expect(text).toContain(`${polishCopy.createAccountCta} ${ORIGIN}/auth/sign-up`)
    expect(text).toContain(`${ORIGIN}/faq`)
  })
})

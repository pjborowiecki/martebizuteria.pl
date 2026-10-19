import { type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-shipped.json"
import polishCopy from "~/messages/pl-PL/emails.order-shipped.json"

const { env, getOrderForShippedEmail, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  env: {},
  getOrderForShippedEmail: vi.fn(),
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

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/lib/image", () => ({ PLACEHOLDER_IMAGE: "https://assets.test/placeholder.svg" }))
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  resolveAssetURL: (src: string) => `https://assets.test/${src}`,
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordOrderEmailOutcome,
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForShippedEmail }))

import { sendOrderShippedEmail } from "~/src/modules/order/use-cases/send-order-shipped-email.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const addressRow = {
  address1: "Krucza 1",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "00-001",
  province: null,
}

const orderRow = {
  addresses: [{ ...addressRow, type: "shipping" }],
  checkout: { shippingAddress: { ...addressRow, address1: "Edited later 9" } },
  deliveryMethod: {
    courier: { internalCode: "inpost", name: "InPost" },
    names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" },
    type: "courier",
  },
  email: "anna@example.com",
  id: "order-abcdef12",
  lockerId: null,
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  recipient: "anna@example.com",
  trackingNumber: null,
  trackingUrl: null,
  userId: "user-1",
}

const PREVIEW_ORIGIN = "https://preview.martebizuteria.pl"

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const sentSubject = (): string | undefined => {
  const [payload] = sendEmail.mock.calls[0] ?? []

  return payload?.subject
}

const sentHtml = (): Promise<string> => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no shipped email was sent")
  }

  return render(payload.react)
}

const SHIPPED_DELIVERY = { idempotencyKey: "order-shipped/order-abcdef12", orderEmail: { kind: "order-shipped" } }

beforeEach(() => {
  vi.useFakeTimers()
  getOrderForShippedEmail.mockReset()
  loadNamespace.mockReset()
  recordOrderEmailOutcome.mockReset()
  sendEmail.mockReset()
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("sendOrderShippedEmail", () => {
  it("records a shipped email that has no order to go out for", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(undefined)

    await expect(sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order shipped",
      metadata: SHIPPED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it.each([[""], ["   "]])("records a shipped email that has no recipient when the order email is %j", async (email) => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, email, recipient: email })

    await expect(sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order has no email address",
      label: "Order shipped",
      metadata: SHIPPED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it("writes to the account's current address once the account has replaced the address the order was placed with", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, email: "anna@example.com", recipient: "anna@new.example" })

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "anna@new.example" }))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(expect.objectContaining({ label: "Order shipped → anna@new.example" }))
  })

  it("emails the shopper in the locale the order was placed in", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-shipped" })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "order-shipped/order-abcdef12", to: "anna@example.com" }),
    )
    expect(sentSubject()).toBe(englishCopy.subject)
  })

  it("links the shopper to their order on the deployment the order was shipped from", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)

    await sendOrderShippedEmail("order-abcdef12", "http://127.0.0.1:3000")

    const html = await sentHtml()

    expect(html).toContain('href="http://127.0.0.1:3000/en-US/account/orders/order-abcdef12"')
    expect(html).not.toContain("https://martebizuteria.pl/")
  })

  it("falls back to the default locale when the order carries no locale", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, metadata: null })
    loadNamespace.mockResolvedValueOnce(polishCopy)

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-shipped" })
    expect(sentSubject()).toBe(polishCopy.subject)
  })

  it("sends the parcel to the address the order kept, not to one the shopper edited later", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)
    const html = await sentHtml()

    expect(html).toContain("Krucza 1")
    expect(html).not.toContain("Edited later 9")
  })

  it("names the carrier, the tracking number and links the carrier's tracking page", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, trackingNumber: "00259007123456789012" })

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)
    const html = await sentHtml()

    expect(html).toContain(englishCopy.carrierLabel)
    expect(html).toContain("00259007123456789012")
    expect(html).toContain('href="https://inpost.pl/sledzenie-przesylek?number=00259007123456789012"')
  })

  it("records a successful send against the order and reports it", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)

    await expect(sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      metadata: SHIPPED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: false,
    })
  })

  it("records the refusal reported by the email transport and reports the send as failed", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)
    sendEmail.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)

    await expect(sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order shipped → anna@example.com",
      metadata: SHIPPED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it("records a shipped email that could not be prepared against the order instead of throwing", async () => {
    getOrderForShippedEmail.mockRejectedValueOnce(new Error("D1_ERROR: no such table"))

    await expect(sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("Order shipped for order order-abcdef12 could not be prepared:", expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "D1_ERROR: no such table",
      label: "Order shipped",
      metadata: SHIPPED_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })
})

describe("sendOrderShippedEmail retries", () => {
  it("rebuilds a refused shipped email for its retry and sends it under the same idempotency key", async () => {
    getOrderForShippedEmail.mockResolvedValue(orderRow)
    sendEmail.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)

    await sendOrderShippedEmail("order-abcdef12", PREVIEW_ORIGIN)
    await vi.runAllTimersAsync()

    expect(getOrderForShippedEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail.mock.calls.map(([options]) => options.idempotencyKey)).toStrictEqual([
      "order-shipped/order-abcdef12",
      "order-shipped/order-abcdef12",
    ])
  })
})

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-shipped.json"
import polishCopy from "~/messages/pl-PL/emails.order-shipped.json"

const { env, getCheckoutEmailContext, getOrderForShippedEmail, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  env: {},
  getCheckoutEmailContext: vi.fn(),
  getOrderForShippedEmail: vi.fn(),
  loadNamespace: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  sendEmail: vi.fn<(options: { readonly react: unknown; readonly subject: string; readonly to: string }) => Promise<string | undefined>>(),
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
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForShippedEmail }))

import { notifyOrderShipped } from "~/src/integrations/resend/order-shipped.notification.server"

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
}

const checkoutContext = {
  billingAddress: null,
  billingAddressId: null,
  customerNote: null,
  deliveryMethod: { name: "Paczkomat", type: "locker" },
  lockerId: "WAW01A",
  shippingAddress: addressRow,
  shippingAddressId: "address-1",
}

const orderRow = {
  checkoutId: "checkout-1",
  email: "anna@example.com",
  id: "order-abcdef12",
  metadata: JSON.stringify({ locale: "en-US" }),
  userId: "user-1",
}

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const sentSubject = (): string | undefined => {
  const [payload] = sendEmail.mock.calls[0] ?? []

  return payload?.subject
}

beforeEach(() => {
  getCheckoutEmailContext.mockReset()
  getOrderForShippedEmail.mockReset()
  loadNamespace.mockReset()
  recordOrderEmailOutcome.mockReset()
  sendEmail.mockReset()
  loadNamespace.mockResolvedValue(englishCopy)
  sendEmail.mockResolvedValue(undefined)
})

describe("notifyOrderShipped", () => {
  it("records a shipped email that has no order to go out for", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(undefined)

    await expect(notifyOrderShipped("order-abcdef12")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order shipped",
      orderId: "order-abcdef12",
    })
  })

  it.each([[""], ["   "]])("records a shipped email that has no recipient when the order email is %j", async (email) => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, email })

    await expect(notifyOrderShipped("order-abcdef12")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order has no email address",
      label: "Order shipped",
      orderId: "order-abcdef12",
    })
  })

  it("emails the shopper in the locale the order was placed in", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null })

    await notifyOrderShipped("order-abcdef12")

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-shipped" })
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "anna@example.com" }))
    expect(sentSubject()).toBe(englishCopy.subject)
  })

  it("falls back to the default locale when the order carries no locale", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null, metadata: null })
    loadNamespace.mockResolvedValueOnce(polishCopy)

    await notifyOrderShipped("order-abcdef12")

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-shipped" })
    expect(sentSubject()).toBe(polishCopy.subject)
  })

  it.each([[null], [""]])("skips the checkout lookup when the checkout id is %j", async (checkoutId) => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId })

    await notifyOrderShipped("order-abcdef12")

    expect(getCheckoutEmailContext).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it("loads the delivery details from the checkout the order came from", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)
    getCheckoutEmailContext.mockResolvedValueOnce(checkoutContext)

    await notifyOrderShipped("order-abcdef12")

    expect(getCheckoutEmailContext).toHaveBeenCalledWith("checkout-1")
  })

  it("still emails the shopper when the checkout can no longer be found", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)
    getCheckoutEmailContext.mockResolvedValueOnce(undefined)

    await notifyOrderShipped("order-abcdef12")

    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it("records a successful send against the order and reports it", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null })

    await expect(notifyOrderShipped("order-abcdef12")).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      orderId: "order-abcdef12",
    })
  })

  it("records the refusal reported by the email transport and reports the send as failed", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null })
    sendEmail.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)

    await expect(notifyOrderShipped("order-abcdef12")).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order shipped → anna@example.com",
      orderId: "order-abcdef12",
    })
  })

  it("records a shipped email that could not be prepared against the order instead of throwing", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)
    getCheckoutEmailContext.mockRejectedValueOnce(new Error("D1_ERROR: no such table"))

    await expect(notifyOrderShipped("order-abcdef12")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("Order shipped for order order-abcdef12 could not be prepared:", expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "D1_ERROR: no such table",
      label: "Order shipped",
      orderId: "order-abcdef12",
    })
  })
})

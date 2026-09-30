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
  it("sends nothing when the order is unknown", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(undefined)

    await notifyOrderShipped("order-abcdef12")

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).not.toHaveBeenCalled()
  })

  it.each([[""], ["   "]])("sends nothing when the order email is %j", async (email) => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, email })

    await notifyOrderShipped("order-abcdef12")

    expect(sendEmail).not.toHaveBeenCalled()
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

  it("records a successful send against the order", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null })

    await notifyOrderShipped("order-abcdef12")

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      orderId: "order-abcdef12",
    })
  })

  it("records the failure reported by the email transport", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, checkoutId: null })
    sendEmail.mockResolvedValueOnce("Invalid recipient")

    await notifyOrderShipped("order-abcdef12")

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "Invalid recipient",
      label: "Order shipped → anna@example.com",
      orderId: "order-abcdef12",
    })
  })
})

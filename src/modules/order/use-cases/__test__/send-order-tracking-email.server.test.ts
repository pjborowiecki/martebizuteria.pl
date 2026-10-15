import { type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-tracking.json"
import polishCopy from "~/messages/pl-PL/emails.order-tracking.json"

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
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForShippedEmail }))

import { sendOrderTrackingEmail } from "~/src/modules/order/use-cases/send-order-tracking-email.server"

const ORIGIN = "https://preview.martebizuteria.pl"

const orderRow = {
  addresses: [],
  checkout: null,
  deliveryMethod: { courier: { name: "InPost" }, name: "Kurier InPost", type: "courier" },
  email: "anna@example.com",
  id: "order-abcdef12",
  lockerId: null,
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  trackingNumber: "TRK-43",
  trackingUrl: "https://tracking.test/TRK-43",
  userId: "user-1",
}

const TRACKING_DELIVERY = {
  idempotencyKey: "order-tracking/order-abcdef12/TRK-43",
  orderEmail: { kind: "order-tracking", trackingNumber: "TRK-43" },
}

const send = () => sendOrderTrackingEmail({ orderId: "order-abcdef12", origin: ORIGIN, trackingNumber: "TRK-43" })

const sentHtml = (): Promise<string> => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no tracking email was sent")
  }

  return render(payload.react)
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

describe("sendOrderTrackingEmail", () => {
  it("records a tracking email that has no order to go out for", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(undefined)

    await expect(send()).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Tracking number",
      metadata: TRACKING_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it("records a tracking email that has no recipient", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({ ...orderRow, email: " " })

    await expect(send()).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(expect.objectContaining({ failure: "The order has no email address" }))
  })

  it("emails the number under a key that names it, in the order's language, with the stored tracking link", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce(orderRow)

    await expect(send()).resolves.toBe(true)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-tracking" })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: TRACKING_DELIVERY.idempotencyKey, subject: englishCopy.subject, to: "anna@example.com" }),
    )
    const html = await sentHtml()
    expect(html).toContain("TRK-43")
    expect(html).toContain('href="https://tracking.test/TRK-43"')
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Tracking number → anna@example.com",
      metadata: TRACKING_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: false,
    })
  })

  it("sends the number it was asked for and leaves out a link stored for another one", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({
      ...orderRow,
      metadata: null,
      trackingNumber: "TRK-44",
      trackingUrl: "https://tracking.test/TRK-44",
    })
    loadNamespace.mockResolvedValueOnce(polishCopy)

    await send()
    const html = await sentHtml()

    expect(html).toContain("TRK-43")
    expect(html).not.toContain("TRK-44")
    expect(html).toContain('href="https://inpost.pl/sledzenie-przesylek?number=TRK-43"')
    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-tracking" })
  })

  it("links a guest to creating an account when the carrier gives no tracking page", async () => {
    getOrderForShippedEmail.mockResolvedValueOnce({
      ...orderRow,
      deliveryMethod: { courier: { name: "M'ARTE Atelier" }, name: "Odbiór w atelier", type: "in_store" },
      trackingUrl: null,
      userId: null,
    })

    await send()

    await expect(sentHtml()).resolves.toContain(`href="${ORIGIN}/en-US/auth/sign-up"`)
  })
})

import { type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-in-progress.json"
import polishCopy from "~/messages/pl-PL/emails.order-in-progress.json"

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
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderForProgressEmail }))

import { sendOrderInProgressEmail } from "~/src/modules/order/use-cases/send-order-in-progress-email.server"

const ORIGIN = "https://preview.martebizuteria.pl"

const orderRow = {
  deliveryMethod: { names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }, type: "locker" },
  email: "anna@example.com",
  id: "order-abcdef12",
  metadata: JSON.stringify({ locale: "en-US" }),
  orderNumber: "MRT-2026-00042",
  recipient: "anna@example.com",
  userId: "user-1",
}

const IN_PROGRESS_DELIVERY = { idempotencyKey: "order-in-progress/order-abcdef12", orderEmail: { kind: "order-in-progress" } }

const sentHtml = (): Promise<string> => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no fulfilment email was sent")
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

describe("sendOrderInProgressEmail", () => {
  it("records an email that has no order to go out for", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce(undefined)

    await expect(sendOrderInProgressEmail("order-abcdef12", ORIGIN)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "The order could not be found",
      label: "Order in progress",
      metadata: IN_PROGRESS_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: true,
    })
  })

  it("records an email that has no recipient", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce({ ...orderRow, email: "", recipient: "" })

    await expect(sendOrderInProgressEmail("order-abcdef12", ORIGIN)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(expect.objectContaining({ failure: "The order has no email address" }))
  })

  it("tells the shopper in the order's language that the order is being prepared and what comes next", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce(orderRow)

    await expect(sendOrderInProgressEmail("order-abcdef12", ORIGIN)).resolves.toBe(true)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "en-US", namespace: "emails.order-in-progress" })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: IN_PROGRESS_DELIVERY.idempotencyKey,
        subject: englishCopy.subject,
        to: "anna@example.com",
      }),
    )
    const text = await sentHtml()
    expect(text).toContain(englishCopy.nextStep.locker)
    expect(text).toContain("InPost parcel locker")
    expect(text).toContain(`${ORIGIN}/en-US/account/orders/order-abcdef12`)
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Order in progress → anna@example.com",
      metadata: IN_PROGRESS_DELIVERY,
      orderId: "order-abcdef12",
      willRetry: false,
    })
  })

  it("writes in Polish by default and treats an order that lost its delivery method as a parcel", async () => {
    getOrderForProgressEmail.mockResolvedValueOnce({ ...orderRow, deliveryMethod: null, metadata: null, userId: null })
    loadNamespace.mockResolvedValueOnce(polishCopy)

    await sendOrderInProgressEmail("order-abcdef12", ORIGIN)
    const text = await sentHtml()

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.order-in-progress" })
    expect(text).toContain(polishCopy.nextStep.courier)
    expect(text).toContain(polishCopy.unavailable)
    expect(text).toContain(`${ORIGIN}/auth/sign-up`)
  })
})

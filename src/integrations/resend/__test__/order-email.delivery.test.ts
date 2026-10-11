import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { notifyShopOfIncident, recordOrderEmailOutcome } = vi.hoisted(() => ({
  notifyShopOfIncident: vi.fn<(incident: unknown) => Promise<void>>(),
  recordOrderEmailOutcome: vi.fn(),
}))

vi.mock("~/src/integrations/resend/incident-alert.notification.server", () => ({ notifyShopOfIncident }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))

import {
  ORDER_EMAIL_RETRIES,
  ORDER_EMAIL_RETRY_BACKOFF,
  ORDER_EMAIL_RETRY_DELAY_MS,
  type OrderEmailOutcome,
  deliverOrderEmail,
} from "~/src/integrations/resend/order-email.delivery.server"

import { executionContextStorage } from "~/src/lib/background"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const DELIVERY = {
  idempotencyKey: "order-shipped/order-1",
  label: "Order shipped",
  orderEmail: { kind: "order-shipped" as const },
  orderId: "order-1",
}

const METADATA = { idempotencyKey: "order-shipped/order-1", orderEmail: { kind: "order-shipped" } }

const SENT: OrderEmailOutcome = { failure: undefined, label: "Order shipped → anna@example.com" }

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const REFUSED: OrderEmailOutcome = { failure: DOMAIN_NOT_VERIFIED, label: "Order shipped → anna@example.com" }

const send = vi.fn<(idempotencyKey: string) => Promise<OrderEmailOutcome>>()

const SECOND_RETRY_DELAY_MS = ORDER_EMAIL_RETRY_DELAY_MS * ORDER_EMAIL_RETRY_BACKOFF

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  send.mockReset()
  notifyShopOfIncident.mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("deliverOrderEmail", () => {
  it("reports an email Resend took at once as sent and records it with its idempotency key", async () => {
    send.mockResolvedValueOnce(SENT)

    await expect(deliverOrderEmail(send, DELIVERY)).resolves.toBe(true)

    expect(send).toHaveBeenCalledExactlyOnceWith("order-shipped/order-1")
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      metadata: METADATA,
      orderId: "order-1",
      willRetry: false,
    })
  })

  it("records a refused first attempt as one that will be retried and reports the email as not sent yet", async () => {
    send.mockResolvedValue(REFUSED)

    await expect(deliverOrderEmail(send, DELIVERY)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order shipped → anna@example.com",
      metadata: METADATA,
      orderId: "order-1",
      willRetry: true,
    })
    expect(notifyShopOfIncident).not.toHaveBeenCalled()
  })

  it("tries a refused email again after one and then four more seconds under the same idempotency key", async () => {
    send.mockResolvedValue(REFUSED)

    await deliverOrderEmail(send, DELIVERY)
    await vi.advanceTimersByTimeAsync(ORDER_EMAIL_RETRY_DELAY_MS - 1)
    expect(send).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(SECOND_RETRY_DELAY_MS)
    expect(send).toHaveBeenCalledTimes(1 + ORDER_EMAIL_RETRIES)
    expect(send.mock.calls.map(([idempotencyKey]) => idempotencyKey)).toStrictEqual([
      "order-shipped/order-1",
      "order-shipped/order-1",
      "order-shipped/order-1",
    ])
  })

  it("records an email still refused after the last retry as failed and tries no more", async () => {
    send.mockResolvedValue(REFUSED)

    await deliverOrderEmail(send, DELIVERY)
    await vi.advanceTimersByTimeAsync(ORDER_EMAIL_RETRY_DELAY_MS + SECOND_RETRY_DELAY_MS)
    await vi.advanceTimersByTimeAsync(SECOND_RETRY_DELAY_MS * ORDER_EMAIL_RETRY_BACKOFF)

    expect(send).toHaveBeenCalledTimes(1 + ORDER_EMAIL_RETRIES)
    expect(recordOrderEmailOutcome).toHaveBeenCalledTimes(2)
    expect(recordOrderEmailOutcome).toHaveBeenLastCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order shipped → anna@example.com",
      metadata: METADATA,
      orderId: "order-1",
      willRetry: false,
    })
  })

  it("records a retry Resend took as sent and stops there", async () => {
    send.mockResolvedValueOnce(REFUSED).mockResolvedValueOnce(SENT)

    await deliverOrderEmail(send, DELIVERY)
    await vi.advanceTimersByTimeAsync(ORDER_EMAIL_RETRY_DELAY_MS + SECOND_RETRY_DELAY_MS)

    expect(send).toHaveBeenCalledTimes(2)
    expect(notifyShopOfIncident).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenLastCalledWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      metadata: METADATA,
      orderId: "order-1",
      willRetry: false,
    })
  })

  it("keeps the retries running for the Worker after the response has gone", async () => {
    send.mockResolvedValue(REFUSED)
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>()

    await executionContextStorage.run({ waitUntil }, () => deliverOrderEmail(send, DELIVERY))

    expect(waitUntil).toHaveBeenCalledOnce()
  })

  it("schedules nothing in the background for an email Resend took at once", async () => {
    send.mockResolvedValueOnce(SENT)
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>()

    await executionContextStorage.run({ waitUntil }, () => deliverOrderEmail(send, DELIVERY))

    expect(waitUntil).not.toHaveBeenCalled()
  })

  it("records an email that could not be prepared with the error message instead of throwing", async () => {
    const failure = new Error("D1_ERROR: no such table")
    send.mockRejectedValueOnce(failure)

    await expect(deliverOrderEmail(send, DELIVERY)).resolves.toBe(false)

    expect(consoleError).toHaveBeenCalledWith("Order shipped for order order-1 could not be prepared:", failure)
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: "D1_ERROR: no such table",
      label: "Order shipped",
      metadata: METADATA,
      orderId: "order-1",
      willRetry: true,
    })
  })

  it("describes a thrown value that is not an error the way the email transport does", async () => {
    send.mockRejectedValueOnce("D1 is unavailable")

    await deliverOrderEmail(send, DELIVERY)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(expect.objectContaining({ failure: "D1 is unavailable", label: "Order shipped" }))
  })

  it("records only the idempotency key of an email that belongs to no order", async () => {
    send.mockResolvedValueOnce(SENT)

    await deliverOrderEmail(send, { idempotencyKey: "payment-failed/cs_1", label: "Payment failed", orderId: "cs_1" })

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { idempotencyKey: "payment-failed/cs_1", orderEmail: undefined }, orderId: "cs_1" }),
    )
  })
})

describe("deliverOrderEmail alerts", () => {
  it("alerts the shop once to an email still refused after the last retry, under its idempotency key", async () => {
    send.mockResolvedValue(REFUSED)

    await deliverOrderEmail(send, DELIVERY)
    await vi.advanceTimersByTimeAsync(ORDER_EMAIL_RETRY_DELAY_MS + SECOND_RETRY_DELAY_MS)
    await vi.advanceTimersByTimeAsync(SECOND_RETRY_DELAY_MS * ORDER_EMAIL_RETRY_BACKOFF)

    expect(notifyShopOfIncident).toHaveBeenCalledExactlyOnceWith({
      detail: `Order shipped — ${DOMAIN_NOT_VERIFIED}`,
      kind: "orderEmailFailed",
      reference: "order-shipped/order-1",
    })
  })
})

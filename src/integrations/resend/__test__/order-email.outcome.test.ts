import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { recordOrderEmailOutcome } = vi.hoisted(() => ({ recordOrderEmailOutcome: vi.fn() }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome }))

import { type OrderEmailOutcome, recordOrderEmailAttempt } from "~/src/integrations/resend/order-email.outcome.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const ORDER = { label: "Order shipped", orderId: "order-1" }

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("recordOrderEmailAttempt", () => {
  it("records an email Resend accepted against the order and reports it as sent", async () => {
    const attempt = Promise.resolve({ failure: undefined, label: "Order shipped → anna@example.com" })

    await expect(recordOrderEmailAttempt(attempt, ORDER)).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Order shipped → anna@example.com",
      orderId: "order-1",
    })
  })

  it("records the refusal Resend gave against the order and reports the email as not sent", async () => {
    const attempt = Promise.resolve({ failure: DOMAIN_NOT_VERIFIED, label: "Order shipped → anna@example.com" })

    await expect(recordOrderEmailAttempt(attempt, ORDER)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order shipped → anna@example.com",
      orderId: "order-1",
    })
  })

  it("records an email that could not be prepared with the error message instead of throwing", async () => {
    const failure = new Error("D1_ERROR: no such table")

    await expect(recordOrderEmailAttempt(Promise.reject(failure), ORDER)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({ failure: "D1_ERROR: no such table", ...ORDER })
  })

  it("keeps the stack of a preparation failure in the Worker log", async () => {
    const failure = new Error("D1_ERROR: no such table")

    await recordOrderEmailAttempt(Promise.reject(failure), ORDER)

    expect(consoleError).toHaveBeenCalledWith("Order shipped for order order-1 could not be prepared:", failure)
  })

  it("describes a thrown value that is not an error the way the email transport does", async () => {
    const prepare = vi.fn<() => Promise<OrderEmailOutcome>>().mockRejectedValue("D1 is unavailable")

    await expect(recordOrderEmailAttempt(prepare(), ORDER)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({ failure: "D1 is unavailable", ...ORDER })
  })
})

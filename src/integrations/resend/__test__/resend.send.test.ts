import { createElement } from "react"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { emailsSend, env, markEmailSenderUnavailable } = vi.hoisted(() => ({
  emailsSend: vi.fn(),
  env: { RESEND_API_KEY: "re_test", RESEND_EMAIL_FROM: "atelier@marte.test" },
  markEmailSenderUnavailable: vi.fn<(reason: string) => Promise<void>>(),
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ markEmailSenderUnavailable }))
vi.mock("resend", () => ({
  Resend: class {
    public readonly emails = { send: emailsSend }
  },
}))

import { SEND_EMAIL_TIMEOUT_MS, sendEmail } from "~/src/integrations/resend/resend.send"

import { APP_NAME } from "~/src/presentation/branding/app"

const body = createElement("p", undefined, "Your order is on its way")

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const refuse = (error: { message: string; name: string; statusCode: number | null }) => {
  emailsSend.mockResolvedValueOnce({ data: null, error })
}

beforeEach(() => {
  emailsSend.mockReset()
  markEmailSenderUnavailable.mockReset()
  markEmailSenderUnavailable.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("sendEmail", () => {
  it("reports no error when Resend accepted the email", async () => {
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null })

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBeUndefined()
  })

  it("sends from the configured address under the store name", async () => {
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null })

    await sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(emailsSend).toHaveBeenCalledWith({
      from: `${APP_NAME} <atelier@marte.test>`,
      react: body,
      subject: "Order shipped",
      to: "anna@example.com",
    })
  })

  it("keeps an explicit sender address", async () => {
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null })

    await sendEmail({ from: "support@marte.test", react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(emailsSend).toHaveBeenCalledWith(expect.objectContaining({ from: "support@marte.test" }))
  })

  it("surfaces the message Resend rejected the email with", async () => {
    emailsSend.mockResolvedValueOnce({ data: null, error: { message: "Invalid recipient", name: "validation_error" } })

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "nope" })).resolves.toBe("Invalid recipient")
  })

  it("surfaces the message of a thrown transport failure", async () => {
    emailsSend.mockRejectedValueOnce(new Error("fetch failed"))

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe("fetch failed")
  })

  it("stringifies a rejection that is not an error", async () => {
    emailsSend.mockRejectedValueOnce("socket closed")

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe("socket closed")
  })
})

describe("sendEmail when Resend does not answer", () => {
  it("gives up after the time limit and reports it as a failure instead of hanging the caller", async () => {
    vi.useFakeTimers()
    emailsSend.mockReturnValueOnce(Promise.withResolvers().promise)

    const sending = sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })
    await vi.advanceTimersByTimeAsync(SEND_EMAIL_TIMEOUT_MS)

    await expect(sending).resolves.toBe(`Resend did not answer within ${SEND_EMAIL_TIMEOUT_MS} ms`)
  })

  it("keeps waiting for a slow answer until the limit is reached", async () => {
    vi.useFakeTimers()
    const answer = Promise.withResolvers<{ data: { id: string }; error: null }>()
    emailsSend.mockReturnValueOnce(answer.promise)

    const sending = sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })
    await vi.advanceTimersByTimeAsync(SEND_EMAIL_TIMEOUT_MS - 1)
    answer.resolve({ data: { id: "email_1" }, error: null })

    await expect(sending).resolves.toBeUndefined()
  })

  it("leaves no timer behind once Resend has answered", async () => {
    vi.useFakeTimers()
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null })

    await sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("sendEmail when Resend refuses every email from this sender", () => {
  it.each([
    ["an unverified sending domain", { message: DOMAIN_NOT_VERIFIED, name: "validation_error", statusCode: 403 }],
    ["an invalid API key", { message: "API key is invalid", name: "invalid_api_key", statusCode: 403 }],
    ["a key restricted to other work", { message: "This API key is restricted", name: "restricted_api_key", statusCode: 401 }],
    ["a malformed sender address", { message: "Invalid `from` field", name: "invalid_from_address", statusCode: 422 }],
    [
      "an exhausted daily quota",
      { message: "You have reached your daily email sending quota", name: "daily_quota_exceeded", statusCode: 429 },
    ],
    [
      "an exhausted monthly quota",
      { message: "You have reached your monthly email sending quota", name: "monthly_quota_exceeded", statusCode: 429 },
    ],
  ])("marks the sender unavailable for %s", async (_label, error) => {
    refuse(error)

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe(error.message)

    expect(markEmailSenderUnavailable).toHaveBeenCalledWith(error.message)
  })

  it("leaves the sender flag to emails every address can trigger, so its state never tells whether an account exists", async () => {
    refuse({ message: DOMAIN_NOT_VERIFIED, name: "validation_error", statusCode: 403 })

    await expect(
      sendEmail({ react: body, revealsAccountExistence: true, subject: "Reset your password", to: "anna@example.com" }),
    ).resolves.toBe(DOMAIN_NOT_VERIFIED)

    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })

  it("still reports the refusal when the sender cannot be marked unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    markEmailSenderUnavailable.mockRejectedValueOnce(new Error("KV PUT failed: 429 Too Many Requests"))
    refuse({ message: DOMAIN_NOT_VERIFIED, name: "validation_error", statusCode: 403 })

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe(DOMAIN_NOT_VERIFIED)
  })
})

describe("sendEmail when Resend refuses one email", () => {
  it.each([
    ["an invalid recipient", { message: "Invalid `to` field", name: "validation_error", statusCode: 422 }],
    ["a burst over the request rate", { message: "Too many requests", name: "rate_limit_exceeded", statusCode: 429 }],
    ["an outage on Resend's side", { message: "Internal server error", name: "application_error", statusCode: 500 }],
  ])("leaves the sender available after %s", async (_label, error) => {
    refuse(error)

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe(error.message)

    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })

  it("leaves the sender available after a transport failure", async () => {
    emailsSend.mockRejectedValueOnce(new Error("fetch failed"))

    await sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })

  it("leaves the sender available once an email is accepted", async () => {
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null })

    await sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })
})

describe("sendEmail from Resend's resend.dev test sender", () => {
  const TESTING_ONLY = "You can only send testing emails to your own email address (owner@marte.test)."

  beforeEach(() => {
    env.RESEND_EMAIL_FROM = "onboarding@resend.dev"
  })

  afterEach(() => {
    env.RESEND_EMAIL_FROM = "atelier@marte.test"
  })

  it("leaves the sender available when Resend refuses a recipient other than the account owner", async () => {
    refuse({ message: TESTING_ONLY, name: "validation_error", statusCode: 403 })

    await expect(sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })).resolves.toBe(TESTING_ONLY)

    expect(emailsSend).toHaveBeenCalledWith(expect.objectContaining({ from: `${APP_NAME} <onboarding@resend.dev>` }))
    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })

  it("leaves the sender available for an explicit test sender too", async () => {
    refuse({ message: TESTING_ONLY, name: "validation_error", statusCode: 403 })

    await sendEmail({ from: "onboarding@Resend.dev", react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(markEmailSenderUnavailable).not.toHaveBeenCalled()
  })

  it("still marks the sender unavailable for a refusal every message would meet", async () => {
    refuse({ message: "You have reached your daily email sending quota", name: "daily_quota_exceeded", statusCode: 429 })

    await sendEmail({ react: body, subject: "Order shipped", to: "anna@example.com" })

    expect(markEmailSenderUnavailable).toHaveBeenCalledWith("You have reached your daily email sending quota")
  })
})

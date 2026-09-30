import { createElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { emailsSend, env } = vi.hoisted(() => ({
  emailsSend: vi.fn(),
  env: { RESEND_API_KEY: "re_test", RESEND_EMAIL_FROM: "atelier@marte.test" },
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("resend", () => ({
  Resend: class {
    public readonly emails = { send: emailsSend }
  },
}))

import { sendEmail } from "~/src/integrations/resend/resend.send"

import { APP_NAME } from "~/src/presentation/branding/app"

const body = createElement("p", undefined, "Your order is on its way")

beforeEach(() => {
  emailsSend.mockReset()
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

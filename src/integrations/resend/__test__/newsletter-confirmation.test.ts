import { type ReactElement } from "react"

import { render } from "react-email"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.newsletter-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-confirmation.json"

const { sendEmail } = vi.hoisted(() => ({
  sendEmail:
    vi.fn<(options: { readonly react: ReactElement; readonly subject: string; readonly to: string }) => Promise<string | undefined>>(),
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))

import { buildNewsletterConfirmUrl, sendNewsletterConfirmation } from "~/src/integrations/resend/newsletter-confirmation.server"

import { APP_URL } from "~/src/presentation/branding/app"

import { ROUTES } from "~/src/routes"

const sentPayload = () => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no confirmation email was sent")
  }

  return payload
}

beforeEach(() => {
  sendEmail.mockReset()
  sendEmail.mockResolvedValue(undefined)
})

describe("buildNewsletterConfirmUrl", () => {
  it("links a Polish subscriber to the unprefixed confirmation page", () => {
    expect(buildNewsletterConfirmUrl("token-1", "pl-PL")).toBe(`${APP_URL}${ROUTES.NEWSLETTER_CONFIRM}?token=token-1`)
  })

  it("links an English subscriber to the confirmation page in their language", () => {
    expect(buildNewsletterConfirmUrl("token-1", "en-US")).toBe(`${APP_URL}/en-US${ROUTES.NEWSLETTER_CONFIRM}?token=token-1`)
  })

  it("escapes the token so it survives the trip through the query string", () => {
    expect(buildNewsletterConfirmUrl("a+b/c=d&e", "pl-PL")).toBe(`${APP_URL}${ROUTES.NEWSLETTER_CONFIRM}?token=a%2Bb%2Fc%3Dd%26e`)
  })
})

describe("sendNewsletterConfirmation", () => {
  it("mails the address that asked to join", async () => {
    await sendNewsletterConfirmation({ email: "anna@example.com", locale: "en-US", token: "token-1" })

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentPayload().to).toBe("anna@example.com")
  })

  it("writes the subject in the subscriber's language", async () => {
    await sendNewsletterConfirmation({ email: "anna@example.com", locale: "pl-PL", token: "token-1" })

    expect(sentPayload().subject).toBe(polishCopy.subject)
  })

  it("puts the confirmation link for this token behind the call to action", async () => {
    await sendNewsletterConfirmation({ email: "anna@example.com", locale: "en-US", token: "token-1" })

    const html = await render(sentPayload().react)

    expect(sentPayload().subject).toBe(englishCopy.subject)
    expect(html).toContain(`href="${buildNewsletterConfirmUrl("token-1", "en-US")}"`)
    expect(html).toContain(englishCopy.cta)
  })

  it("hands a refused send back to the caller so the subscriber is not told an email is on its way", async () => {
    sendEmail.mockResolvedValueOnce("The pjborowiecki.com domain is not verified")

    await expect(sendNewsletterConfirmation({ email: "anna@example.com", locale: "en-US", token: "token-1" })).resolves.toBe(
      "The pjborowiecki.com domain is not verified",
    )
  })

  it("reports no failure when the email went out", async () => {
    await expect(sendNewsletterConfirmation({ email: "anna@example.com", locale: "en-US", token: "token-1" })).resolves.toBeUndefined()
  })
})

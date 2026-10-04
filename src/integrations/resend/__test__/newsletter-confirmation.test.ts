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

import { ROUTES } from "~/src/routes"

const LOCAL_ORIGIN = "http://localhost:3000"

const subscription = { email: "anna@example.com", locale: "en-US", origin: LOCAL_ORIGIN, token: "token-1" } as const

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
  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "https://preview.martebizuteria.pl", "https://martebizuteria.pl"])(
    "links a Polish subscriber back to the unprefixed confirmation page on %s, where they subscribed",
    (origin) => {
      expect(buildNewsletterConfirmUrl({ locale: "pl-PL", origin, token: "token-1" })).toBe(
        `${origin}${ROUTES.NEWSLETTER_CONFIRM}?token=token-1`,
      )
    },
  )

  it.each(["http://127.0.0.1:3000", "https://martebizuteria.pl"])(
    "links an English subscriber to the confirmation page in their language on %s",
    (origin) => {
      expect(buildNewsletterConfirmUrl({ locale: "en-US", origin, token: "token-1" })).toBe(
        `${origin}/en-US${ROUTES.NEWSLETTER_CONFIRM}?token=token-1`,
      )
    },
  )

  it("escapes the token so it survives the trip through the query string", () => {
    expect(buildNewsletterConfirmUrl({ locale: "pl-PL", origin: LOCAL_ORIGIN, token: "a+b/c=d&e" })).toBe(
      `${LOCAL_ORIGIN}${ROUTES.NEWSLETTER_CONFIRM}?token=a%2Bb%2Fc%3Dd%26e`,
    )
  })
})

describe("sendNewsletterConfirmation", () => {
  it("mails the address that asked to join", async () => {
    await sendNewsletterConfirmation(subscription)

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentPayload().to).toBe("anna@example.com")
  })

  it("writes the subject in the subscriber's language", async () => {
    await sendNewsletterConfirmation({ ...subscription, locale: "pl-PL" })

    expect(sentPayload().subject).toBe(polishCopy.subject)
  })

  it("puts the confirmation link for this token, on the address the subscriber used, behind the call to action", async () => {
    await sendNewsletterConfirmation(subscription)

    const html = await render(sentPayload().react)

    expect(sentPayload().subject).toBe(englishCopy.subject)
    expect(html).toContain('href="http://localhost:3000/en-US/newsletter/confirm?token=token-1"')
    expect(html).not.toContain("martebizuteria.pl/")
    expect(html).toContain(englishCopy.cta)
  })

  it("hands a refused send back to the caller so the subscriber is not told an email is on its way", async () => {
    sendEmail.mockResolvedValueOnce("The pjborowiecki.com domain is not verified")

    await expect(sendNewsletterConfirmation(subscription)).resolves.toBe("The pjborowiecki.com domain is not verified")
  })

  it("reports no failure when the email went out", async () => {
    await expect(sendNewsletterConfirmation(subscription)).resolves.toBeUndefined()
  })
})

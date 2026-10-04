import { type ReactElement } from "react"

import { render } from "react-email"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-already-subscribed.json"

const { sendEmail } = vi.hoisted(() => ({
  sendEmail:
    vi.fn<(options: { readonly react: ReactElement; readonly subject: string; readonly to: string }) => Promise<string | undefined>>(),
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))

import { sendNewsletterAlreadySubscribed } from "~/src/integrations/resend/newsletter-already-subscribed.server"

const notice = { email: "anna@example.com", locale: "en-US", origin: "http://127.0.0.1:3000" } as const

const sentPayload = () => {
  const [payload] = sendEmail.mock.calls[0] ?? []
  if (payload === undefined) {
    throw new Error("no already-subscribed email was sent")
  }

  return payload
}

beforeEach(() => {
  sendEmail.mockReset()
  sendEmail.mockResolvedValue(undefined)
})

describe("sendNewsletterAlreadySubscribed", () => {
  it("mails the address that was submitted", async () => {
    await sendNewsletterAlreadySubscribed(notice)

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentPayload().to).toBe("anna@example.com")
  })

  it("writes the subject in the language the form was used in", async () => {
    await sendNewsletterAlreadySubscribed({ ...notice, locale: "pl-PL" })

    expect(sentPayload().subject).toBe(polishCopy.subject)
  })

  it("links an English reader to the storefront in their language, on the address the form was used on", async () => {
    await sendNewsletterAlreadySubscribed(notice)

    const html = await render(sentPayload().react)

    expect(sentPayload().subject).toBe(englishCopy.subject)
    expect(html).toContain('href="http://127.0.0.1:3000/en-US"')
    expect(html).not.toContain("martebizuteria.pl/")
    expect(html).toContain(englishCopy.cta)
  })

  it("hands a refused send back to the caller", async () => {
    sendEmail.mockResolvedValueOnce("The pjborowiecki.com domain is not verified")

    await expect(sendNewsletterAlreadySubscribed(notice)).resolves.toBe("The pjborowiecki.com domain is not verified")
  })

  it("reports no failure when the email went out", async () => {
    await expect(sendNewsletterAlreadySubscribed(notice)).resolves.toBeUndefined()
  })
})

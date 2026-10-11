import { type ReactElement } from "react"

import { render } from "react-email"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.newsletter-campaign.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-campaign.json"

interface SentEmail {
  readonly from: string
  readonly headers?: Record<string, string>
  readonly react: ReactElement
  readonly replyTo: string
  readonly subject: string
  readonly to: string
}

const { batchSend, env } = vi.hoisted(() => ({
  batchSend: vi.fn<(emails: SentEmail[], options: { idempotencyKey?: string }) => Promise<{ error: { message: string } | null }>>(),
  env: { RESEND_API_KEY: "re_test", RESEND_EMAIL_FROM: "atelier@marte.test" },
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/resend/resend.config", () => ({ resend: { batch: { send: batchSend } } }))

import { sendNewsletterBatch } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-batch.server"

import { APP_NAME } from "~/src/presentation/branding/app"
import { BUSINESS } from "~/src/presentation/branding/business"

const ORIGIN = "https://martebizuteria.pl"

const CONTENT = {
  bodies: { "en-US": "New rings are **in**.", "pl-PL": "Nowe pierścionki już są." },
  origin: ORIGIN,
  subjects: { "en-US": "Autumn pieces", "pl-PL": "Jesienne projekty" },
}

const ANNA = { email: "anna@example.test", locale: "pl-PL", unsubscribeToken: "token a+b" } as const

const BEN = { email: "ben@example.test", locale: "en-US", unsubscribeToken: "token-ben" } as const

const sentEmails = (): SentEmail[] => {
  const [call] = batchSend.mock.calls
  if (call === undefined) {
    throw new Error("no batch was sent")
  }

  return call[0]
}

const sentEmail = (index: number): SentEmail => {
  const email = sentEmails().at(index)
  if (email === undefined) {
    throw new Error(`the batch held no email ${String(index)}`)
  }

  return email
}

beforeEach(() => {
  batchSend.mockReset()
  batchSend.mockResolvedValue({ error: null })
})

describe("sendNewsletterBatch", () => {
  it("sends one email per subscriber in a single batch call, guarded by the campaign's idempotency key", async () => {
    await expect(
      sendNewsletterBatch({ content: CONTENT, idempotencyKey: "newsletter-1", recipients: [ANNA, BEN] }),
    ).resolves.toBeUndefined()

    expect(batchSend).toHaveBeenCalledOnce()
    expect(batchSend.mock.calls[0]?.[1]).toStrictEqual({ idempotencyKey: "newsletter-1" })
    expect(sentEmails().map((email) => email.to)).toStrictEqual([ANNA.email, BEN.email])
  })

  it("sends from the shop under its name and takes replies at the shop's contact address", async () => {
    await sendNewsletterBatch({ content: CONTENT, recipients: [ANNA] })

    expect(sentEmail(0).from).toBe(`${APP_NAME} <${env.RESEND_EMAIL_FROM}>`)
    expect(sentEmail(0).replyTo).toBe(BUSINESS.EMAIL)
  })

  it("writes each email in the subscriber's language", async () => {
    await sendNewsletterBatch({ content: CONTENT, recipients: [ANNA, BEN] })

    const [polish, english] = await Promise.all([render(sentEmail(0).react), render(sentEmail(1).react)])

    expect(sentEmail(0).subject).toBe(CONTENT.subjects["pl-PL"])
    expect(polish).toContain(CONTENT.bodies["pl-PL"])
    expect(polish).toContain(polishCopy.unsubscribe)
    expect(sentEmail(1).subject).toBe(CONTENT.subjects["en-US"])
    expect(english).toContain("New rings are <strong")
    expect(english).toContain(englishCopy.unsubscribe)
  })

  it("asks mail providers for one-click unsubscribe at the subscriber's own token", async () => {
    await sendNewsletterBatch({ content: CONTENT, recipients: [ANNA] })

    expect(sentEmail(0).headers).toStrictEqual({
      "List-Unsubscribe": `<${ORIGIN}/api/newsletter/unsubscribe?token=token%20a%2Bb>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    })
  })

  it("links the visible unsubscribe to the page in the subscriber's language, which needs no sign-in", async () => {
    await sendNewsletterBatch({ content: CONTENT, recipients: [ANNA, BEN] })

    const [polish, english] = await Promise.all([render(sentEmail(0).react), render(sentEmail(1).react)])

    expect(polish).toContain(`href="${ORIGIN}/newsletter/unsubscribe?token=token%20a%2Bb"`)
    expect(english).toContain(`href="${ORIGIN}/en-US/newsletter/unsubscribe?token=token-ben"`)
  })

  it("sends a test without unsubscribe headers or a key, linking to the unsubscribe page alone", async () => {
    await sendNewsletterBatch({
      content: CONTENT,
      recipients: [{ email: "owner@marte.test", locale: "en-US", unsubscribeToken: undefined }],
    })

    expect(batchSend.mock.calls[0]?.[1]).toStrictEqual({})
    expect(sentEmail(0).headers).toBeUndefined()
    await expect(render(sentEmail(0).react)).resolves.toContain(`href="${ORIGIN}/en-US/newsletter/unsubscribe"`)
  })

  it("reports the reason Resend refused the batch", async () => {
    batchSend.mockResolvedValue({ error: { message: "Too many requests" } })

    await expect(sendNewsletterBatch({ content: CONTENT, recipients: [ANNA] })).resolves.toBe("Too many requests")
  })

  it("reports a request that failed before Resend answered", async () => {
    batchSend.mockRejectedValueOnce(new Error("fetch failed"))
    await expect(sendNewsletterBatch({ content: CONTENT, recipients: [ANNA] })).resolves.toBe("fetch failed")

    batchSend.mockRejectedValueOnce("socket hang up")
    await expect(sendNewsletterBatch({ content: CONTENT, recipients: [ANNA] })).resolves.toBe("socket hang up")
  })
})

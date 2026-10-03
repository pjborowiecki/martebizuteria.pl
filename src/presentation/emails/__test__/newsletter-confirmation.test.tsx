import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.newsletter-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-confirmation.json"
import { NEWSLETTER_CONFIRMATION_NAMESPACE, NewsletterConfirmation } from "~/src/presentation/emails/newsletter-confirmation"

const CONFIRM_URL = "https://martebizuteria.pl/en-US/newsletter/confirm?token=abc123"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (): Promise<string> =>
  render(<NewsletterConfirmation confirmUrl={CONFIRM_URL} locale="en-US" messages={englishCopy} />, { plainText: true })

const renderHtml = (): Promise<string> => render(<NewsletterConfirmation confirmUrl={CONFIRM_URL} locale="en-US" messages={englishCopy} />)

describe("NewsletterConfirmation", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(NEWSLETTER_CONFIRMATION_NAMESPACE).toBe("emails.newsletter-confirmation")
  })

  it("asks the recipient to confirm and tells them what to do if they never asked", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
  })

  it("links the call to action to the confirmation url", async () => {
    const html = await renderHtml()

    expect(html).toContain(`href="${CONFIRM_URL}"`)
    expect(html).toContain(englishCopy.cta)
  })

  it("promises a way off the list and signs off as the atelier", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.unsubscribeNote)
    expect(text).toContain(englishCopy.signoff)
    expect(text).toContain(englishCopy.sender)
  })

  it("declares the document language and the inbox preview line", async () => {
    const html = await renderHtml()

    expect(html).toContain('lang="en-US"')
    expect(html).toContain(asHtmlText(englishCopy.preview))
  })

  it("renders Polish copy when given the Polish namespace", async () => {
    const html = await render(<NewsletterConfirmation confirmUrl={CONFIRM_URL} locale="pl-PL" messages={polishCopy} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(polishCopy.cta)
    expect(html).not.toContain(englishCopy.cta)
  })
})

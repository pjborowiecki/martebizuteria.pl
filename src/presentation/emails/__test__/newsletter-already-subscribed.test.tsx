import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-already-subscribed.json"
import {
  NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE,
  NewsletterAlreadySubscribed,
} from "~/src/presentation/emails/newsletter-already-subscribed"

const STOREFRONT_URL = "https://martebizuteria.pl/en-US"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (): Promise<string> =>
  render(<NewsletterAlreadySubscribed locale="en-US" messages={englishCopy} storefrontUrl={STOREFRONT_URL} />, { plainText: true })

const renderHtml = (): Promise<string> =>
  render(<NewsletterAlreadySubscribed locale="en-US" messages={englishCopy} storefrontUrl={STOREFRONT_URL} />)

describe("NewsletterAlreadySubscribed", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE).toBe("emails.newsletter-already-subscribed")
  })

  it("tells the recipient they are already on the list and what to do if they never asked", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
  })

  it("links the call to action to the storefront rather than to a confirmation", async () => {
    const html = await renderHtml()

    expect(html).toContain(`href="${STOREFRONT_URL}"`)
    expect(html).toContain(englishCopy.cta)
    expect(html).not.toContain("newsletter/confirm")
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
    const html = await render(<NewsletterAlreadySubscribed locale="pl-PL" messages={polishCopy} storefrontUrl={STOREFRONT_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(polishCopy.heading)
    expect(html).not.toContain(englishCopy.cta)
  })
})

import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import englishCopy from "~/messages/en-US/emails.newsletter-campaign.json"
import polishCopy from "~/messages/pl-PL/emails.newsletter-campaign.json"
import { NEWSLETTER_CAMPAIGN_NAMESPACE, NewsletterCampaignEmail } from "~/src/presentation/emails/newsletter-campaign"

const UNSUBSCRIBE_URL = "https://martebizuteria.pl/en-US/newsletter/unsubscribe?token=token-1"

const BODY = "## New rings\n\nThe **Luna** ring is back. [See it](https://martebizuteria.pl/en-US/products/luna).\n\n- Silver\n- Gold"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const englishLetter = (
  <NewsletterCampaignEmail
    body={BODY}
    locale="en-US"
    messages={englishCopy}
    seller={TEST_SELLER_DETAILS}
    subject="Autumn pieces"
    unsubscribeUrl={UNSUBSCRIBE_URL}
  />
)

const renderEnglish = (): Promise<string> => render(englishLetter)

describe("NewsletterCampaignEmail", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(NEWSLETTER_CAMPAIGN_NAMESPACE).toBe("emails.newsletter-campaign")
  })

  it("heads the letter with its subject and renders the owner's markdown as email markup", async () => {
    const html = await renderEnglish()

    expect(html).toContain("Autumn pieces")
    expect(html).toContain("New rings</h2>")
    expect(html).toContain("Luna</strong>")
    expect(html).toContain('href="https://martebizuteria.pl/en-US/products/luna"')
    expect(html).toContain("Silver</li>")
  })

  it("says why the reader receives it and links to the unsubscribe page", async () => {
    const html = await renderEnglish()

    expect(html).toContain(asHtmlText(englishCopy.reason))
    expect(html).toContain(`href="${UNSUBSCRIBE_URL}"`)
    expect(html).toContain(englishCopy.unsubscribe)
  })

  it("keeps the unsubscribe link in the plain text version", async () => {
    await expect(render(englishLetter, { plainText: true })).resolves.toContain(UNSUBSCRIBE_URL)
  })

  it("names the seller who sends it, with the stored address and e-mail, in the HTML and the plain text", async () => {
    const html = await renderEnglish()
    const text = await render(englishLetter, { plainText: true })

    for (const line of [englishCopy.sender.label, "Pracownia Testowa Anna Nowak", "ul. Floriańska 1", "31-001 Kraków", "Poland"]) {
      expect(html).toContain(line)
      expect(text).toContain(line)
    }
    expect(html).toContain(`href="mailto:${TEST_SELLER_DETAILS.email}"`)
    expect(text).toContain(`${englishCopy.sender.emailLabel}: ${TEST_SELLER_DETAILS.email}`)
  })

  it("declares the document language and the inbox preview line", async () => {
    const html = await renderEnglish()

    expect(html).toContain('lang="en-US"')
    expect(html).toContain(asHtmlText(englishCopy.preview))
  })

  it("renders the Polish frame around a Polish letter", async () => {
    const html = await render(
      <NewsletterCampaignEmail
        body="Nowe pierścionki."
        locale="pl-PL"
        messages={polishCopy}
        seller={TEST_SELLER_DETAILS}
        subject="Jesień"
        unsubscribeUrl={UNSUBSCRIBE_URL}
      />,
    )

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(polishCopy.unsubscribe)
    expect(html).toContain(polishCopy.sender.label)
    expect(html).toContain("Polska")
    expect(html).not.toContain(englishCopy.unsubscribe)
    expect(html).not.toContain("Poland")
  })
})

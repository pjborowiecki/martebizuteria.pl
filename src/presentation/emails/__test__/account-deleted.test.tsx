import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.account-deleted.json"
import polishCopy from "~/messages/pl-PL/emails.account-deleted.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"

const STOREFRONT_URL = "https://martebizuteria.pl/en-US"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (name?: string): Promise<string> =>
  render(
    <AccountDeleted locale="en-US" messages={englishCopy} {...(name === undefined ? {} : { name })} storefrontUrl={STOREFRONT_URL} />,
    { plainText: true },
  )

describe("AccountDeleted", () => {
  it("renders an unnamed recipient without exposing a missing value", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.message)
    expect(text).not.toContain("undefined")
    expect(text).not.toContain("{name}")
  })

  it("names the namespace the messages are loaded under", () => {
    expect(ACCOUNT_DELETED_NAMESPACE).toBe("emails.account-deleted")
  })

  it("greets the former customer by name", async () => {
    await expect(renderText("Jane Doe")).resolves.toContain("Dear Jane Doe,")
  })

  it("confirms the personal data was removed and the shop stays open", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
    expect(text).toContain(englishCopy.messageTertiary)
  })

  it.each([
    ["en-US", englishCopy],
    ["pl-PL", polishCopy],
  ] as const)("says in %s what was deleted, and that the orders are kept for the accounting records", async (locale, copy) => {
    const text = await render(<AccountDeleted locale={locale} messages={copy} name="Anna" storefrontUrl={STOREFRONT_URL} />, {
      plainText: true,
    })

    expect(text).toContain(copy.deleted)
    expect(text).toContain(copy.kept)
  })

  it("no longer claims that every piece of personal data is gone", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain("Stripe")
    expect(text).toContain("5 years")
    expect(text).not.toContain("All personal data")
  })

  it("tells an unaware recipient to reply so the deletion can be checked", async () => {
    await expect(renderText("Jane Doe")).resolves.toContain(englishCopy.security)
  })

  it("sends the shopper back to the storefront rather than to a token link", async () => {
    const html = await render(<AccountDeleted locale="en-US" messages={englishCopy} name="Jane Doe" storefrontUrl={STOREFRONT_URL} />)

    expect(html).toContain(`href="${STOREFRONT_URL}"`)
    expect(html).toContain(asHtmlText(englishCopy.cta))
    expect(html).not.toContain("token=")
  })

  it("has no expiring link, so it mentions no expiry", async () => {
    const text = await renderText("Jane Doe")

    expect(text).not.toContain("expire")
  })

  it("renders Polish copy with a greeting that does not assume gender", async () => {
    const html = await render(<AccountDeleted locale="pl-PL" messages={polishCopy} name="Anna" storefrontUrl={STOREFRONT_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain("Witaj Anna,")
    expect(html).toContain(asHtmlText(polishCopy.heading))
  })
})

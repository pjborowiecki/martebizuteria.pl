import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.verify-email.json"
import polishCopy from "~/messages/pl-PL/emails.verify-email.json"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"

const VERIFICATION_URL = "https://martebizuteria.pl/en-US/auth/verify-email?token=12345"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (name?: string): Promise<string> =>
  render(
    <VerifyEmail locale="en-US" messages={englishCopy} {...(name === undefined ? {} : { name })} verificationUrl={VERIFICATION_URL} />,
    { plainText: true },
  )

const renderHtml = (): Promise<string> =>
  render(<VerifyEmail locale="en-US" messages={englishCopy} name="Jane Doe" verificationUrl={VERIFICATION_URL} />)

describe("VerifyEmail", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(VERIFY_EMAIL_NAMESPACE).toBe("emails.verify-email")
  })

  it("greets the recipient by name", async () => {
    await expect(renderText("Jane Doe")).resolves.toContain("Dear Jane Doe,")
  })

  it("keeps the greeting well formed when no name is known", async () => {
    const text = await renderText()

    expect(text).toContain("Dear ,")
    expect(text).not.toContain("undefined")
  })

  it("renders the heading and the highlight box copy", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.highlightTitle)
    expect(text).toContain(englishCopy.highlightBody)
  })

  it("explains the link expiry and what to do if the account was not requested", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.expiry)
    expect(text).toContain(englishCopy.ignore)
  })

  it("links the call to action to the verification url", async () => {
    const html = await renderHtml()

    expect(html).toContain(`href="${VERIFICATION_URL}"`)
    expect(html).toContain(englishCopy.cta)
  })

  it("declares the document language and the inbox preview line", async () => {
    const html = await renderHtml()

    expect(html).toContain('lang="en-US"')
    expect(html).toContain(asHtmlText(englishCopy.preview))
  })

  it("renders Polish copy when given the Polish namespace", async () => {
    const html = await render(<VerifyEmail locale="pl-PL" messages={polishCopy} name="Anna" verificationUrl={VERIFICATION_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain("Witaj Anna,")
    expect(html).not.toContain(englishCopy.expiry)
  })

  it("signs off as the atelier", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.signoff)
    expect(text).toContain(englishCopy.sender)
  })
})

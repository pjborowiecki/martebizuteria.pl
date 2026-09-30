import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.reset-password.json"
import polishCopy from "~/messages/pl-PL/emails.reset-password.json"
import { RESET_PASSWORD_NAMESPACE, ResetPassword } from "~/src/presentation/emails/reset-password"

const RESET_URL = "https://martebizuteria.pl/en-US/auth/reset-password?token=12345"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (name?: string): Promise<string> =>
  render(<ResetPassword locale="en-US" messages={englishCopy} {...(name === undefined ? {} : { name })} resetPasswordUrl={RESET_URL} />, {
    plainText: true,
  })

describe("ResetPassword", () => {
  it("renders an unnamed recipient without exposing a missing value", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.message)
    expect(text).toContain(RESET_URL)
    expect(text).not.toContain("undefined")
    expect(text).not.toContain("{name}")
  })

  it("names the namespace the messages are loaded under", () => {
    expect(RESET_PASSWORD_NAMESPACE).toBe("emails.reset-password")
  })

  it("greets the recipient by name", async () => {
    await expect(renderText("Jane Doe")).resolves.toContain("Dear Jane Doe,")
  })

  it("renders the heading and both explanatory paragraphs", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
  })

  it("carries the expiry, the ignore note and the security warning", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.expiry)
    expect(text).toContain(englishCopy.ignore)
    expect(text).toContain(englishCopy.security)
  })

  it("has no highlight box, unlike the verification emails", async () => {
    const text = await renderText("Jane Doe")

    expect(text).not.toContain("Why we ask")
  })

  it("points the button at the one-time reset link", async () => {
    const html = await render(<ResetPassword locale="en-US" messages={englishCopy} name="Jane Doe" resetPasswordUrl={RESET_URL} />)

    expect(html).toContain(`href="${RESET_URL}"`)
    expect(html).toContain(englishCopy.cta)
    expect(html).toContain(asHtmlText(englishCopy.preview))
  })

  it("renders Polish copy with the Polish greeting", async () => {
    const html = await render(<ResetPassword locale="pl-PL" messages={polishCopy} name="Anna" resetPasswordUrl={RESET_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain("Witaj Anna,")
    expect(html).toContain(asHtmlText(polishCopy.heading))
  })
})

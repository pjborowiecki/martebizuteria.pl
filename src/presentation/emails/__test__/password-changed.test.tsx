import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.password-changed.json"
import polishCopy from "~/messages/pl-PL/emails.password-changed.json"
import { PASSWORD_CHANGED_NAMESPACE, PasswordChanged } from "~/src/presentation/emails/password-changed"

const SIGN_IN_URL = "https://martebizuteria.pl/en-US/auth/sign-in"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (): Promise<string> =>
  render(<PasswordChanged locale="en-US" messages={englishCopy} name="Jane Doe" signInUrl={SIGN_IN_URL} />, { plainText: true })

describe("PasswordChanged", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(PASSWORD_CHANGED_NAMESPACE).toBe("emails.password-changed")
  })

  it("greets the customer by name", async () => {
    await expect(renderText()).resolves.toContain("Dear Jane Doe,")
  })

  it("says the password changed and every device was signed out", async () => {
    const text = await renderText()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
  })

  it("tells a customer who did not change it how to take the account back", async () => {
    await expect(renderText()).resolves.toContain(englishCopy.security)
  })

  it("sends the customer to sign in rather than to a token link", async () => {
    const html = await render(<PasswordChanged locale="en-US" messages={englishCopy} name="Jane Doe" signInUrl={SIGN_IN_URL} />)

    expect(html).toContain(`href="${SIGN_IN_URL}"`)
    expect(html).toContain(englishCopy.cta)
    expect(html).toContain(asHtmlText(englishCopy.preview))
    expect(html).not.toContain("token=")
  })

  it("renders Polish copy with the Polish greeting", async () => {
    const html = await render(<PasswordChanged locale="pl-PL" messages={polishCopy} name="Anna" signInUrl={SIGN_IN_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain("Witaj Anna,")
    expect(html).toContain(asHtmlText(polishCopy.heading))
  })
})

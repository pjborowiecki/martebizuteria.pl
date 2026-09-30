import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.change-email.json"
import polishCopy from "~/messages/pl-PL/emails.change-email.json"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail } from "~/src/presentation/emails/change-email"

const VERIFICATION_URL = "https://martebizuteria.pl/en-US/auth/verify-email?token=change-me"

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderText = (name?: string): Promise<string> =>
  render(
    <ChangeEmail locale="en-US" messages={englishCopy} {...(name === undefined ? {} : { name })} verificationUrl={VERIFICATION_URL} />,
    { plainText: true },
  )

describe("ChangeEmail", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(CHANGE_EMAIL_NAMESPACE).toBe("emails.change-email")
  })

  it("greets the recipient by name and leaves no placeholder when there is none", async () => {
    await expect(renderText("Jane Doe")).resolves.toContain("Dear Jane Doe,")
    await expect(renderText()).resolves.not.toContain("{name}")
  })

  it("states that the current address stays in use until the change is confirmed", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.messageTertiary)
  })

  it("explains in the highlight box why confirmation is required", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.highlightTitle)
    expect(text).toContain(englishCopy.highlightBody)
  })

  it("carries the expiry and the reassurance for an unrequested change", async () => {
    const text = await renderText("Jane Doe")

    expect(text).toContain(englishCopy.expiry)
    expect(text).toContain(englishCopy.ignore)
  })

  it("points the button at the confirmation link for the new address", async () => {
    const html = await render(<ChangeEmail locale="en-US" messages={englishCopy} name="Jane Doe" verificationUrl={VERIFICATION_URL} />)

    expect(html).toContain(`href="${VERIFICATION_URL}"`)
    expect(html).toContain(englishCopy.cta)
  })

  it("renders Polish copy with the Polish heading", async () => {
    const html = await render(<ChangeEmail locale="pl-PL" messages={polishCopy} name="Anna" verificationUrl={VERIFICATION_URL} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain(asHtmlText(polishCopy.highlightBody))
  })
})

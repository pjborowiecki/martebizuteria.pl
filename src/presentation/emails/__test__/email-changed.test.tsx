import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.email-changed.json"
import polishCopy from "~/messages/pl-PL/emails.email-changed.json"
import { EMAIL_CHANGED_NAMESPACE, EmailChanged } from "~/src/presentation/emails/email-changed"

const SELLER = { email: "kontakt@martebizuteria.pl", phone: "+48 663 150 820" }

const renderText = (): Promise<string> =>
  render(<EmailChanged locale="en-US" maskedEmail="n***@e***.com" messages={englishCopy} name="Jane Doe" seller={SELLER} />, {
    plainText: true,
  })

describe("EmailChanged", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(EMAIL_CHANGED_NAMESPACE).toBe("emails.email-changed")
  })

  it("tells the old address which address the account signs in with now, without spelling it out", async () => {
    const text = await renderText()

    expect(text).toContain("Dear Jane Doe,")
    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain("has just been changed to n***@e***.com")
    expect(text).toContain(englishCopy.messageSecondary)
  })

  it("gives the shop's contact details to a customer who did not make the change", async () => {
    await expect(renderText()).resolves.toContain(
      "Reply to this email, write to kontakt@martebizuteria.pl or call +48 663 150 820 straight away",
    )
  })

  it("renders Polish copy with the Polish greeting", async () => {
    const html = await render(<EmailChanged locale="pl-PL" maskedEmail="n***@e***.com" messages={polishCopy} name="Anna" seller={SELLER} />)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain("Witaj Anna,")
    expect(html).toContain(polishCopy.heading)
  })
})

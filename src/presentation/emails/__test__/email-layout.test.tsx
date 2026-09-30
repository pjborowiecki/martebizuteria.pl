import { Text, render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { EMAIL_TAILWIND_CONFIG, EmailLayout } from "~/src/presentation/emails/email-layout"

const renderLayout = (locale: "en-US" | "pl-PL", plainText = false): Promise<string> =>
  render(
    <EmailLayout locale={locale} preview="Preview line" tagline="Handcrafted Jewelry">
      <Text>Body copy</Text>
    </EmailLayout>,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("EmailLayout", () => {
  it("locks the email to the light colour scheme", async () => {
    const html = await renderLayout("en-US")

    expect(html).toContain('<meta content="light only" name="color-scheme"/>')
    expect(html).toContain('<meta content="light only" name="supported-color-schemes"/>')
  })

  it("puts the preview line in the title and the hidden preheader", async () => {
    const html = await renderLayout("en-US")

    expect(html).toContain("<title>Preview line</title>")
    expect(html).toContain('data-skip-in-text="true"')
  })

  it("keeps the preview out of the plain text body", async () => {
    const text = await renderLayout("en-US", true)

    expect(text).not.toContain("Preview line")
    expect(text).toContain("Body copy")
  })

  it("declares the locale on the document, body and container", async () => {
    const html = await renderLayout("pl-PL")

    expect(html).toContain('<html dir="ltr" lang="pl-PL">')
    expect(html.match(/lang="pl-PL"/gu)).toHaveLength(4)
  })

  it("renders the wordmark above the content and again in the footer", async () => {
    const text = await renderLayout("en-US", true)

    expect(text.match(/M'ARTE/gu)).toHaveLength(2)
  })

  it("shows the tagline it was given", async () => {
    const text = await renderLayout("en-US", true)

    expect(text).toContain("Handcrafted Jewelry")
  })

  it("renders the children between the header and the footer", async () => {
    const text = await renderLayout("en-US", true)
    const [header, footer] = text.split("Body copy")

    expect(header).toContain("Handcrafted Jewelry")
    expect(footer).toContain("M'ARTE")
  })

  it("paints the cream page and the paper container from the brand palette", async () => {
    const html = await renderLayout("en-US")

    expect(html).toContain("background-color:#f3f0ea")
    expect(html).toContain("background-color:#ffffff")
    expect(html).toContain("border:1px solid #e2ddd4")
    expect(html).toContain("max-width:560px")
  })

  it("resolves the brand colour utilities through the Tailwind config", async () => {
    const html = await renderLayout("en-US")

    expect(html).toContain("color:rgb(22,20,15)")
    expect(html).toContain("border-color:rgb(179,155,109)")
  })
})

describe("EMAIL_TAILWIND_CONFIG", () => {
  it("defines the brand palette the email classes depend on", () => {
    expect(EMAIL_TAILWIND_CONFIG.theme.extend.colors).toStrictEqual({
      cream: "#f3f0ea",
      gold: "#b39b6d",
      ink: "#16140f",
      line: "#e2ddd4",
      muted: "#7a746a",
      paper: "#ffffff",
      wash: "#faf8f5",
    })
  })

  it("uses only email safe font stacks", () => {
    expect(EMAIL_TAILWIND_CONFIG.theme.extend.fontFamily.serif).toStrictEqual(["Georgia", "Cambria", "Times New Roman", "Times", "serif"])
    expect(EMAIL_TAILWIND_CONFIG.theme.extend.fontFamily.sans).toStrictEqual(["Helvetica Neue", "Helvetica", "Arial", "sans-serif"])
  })
})

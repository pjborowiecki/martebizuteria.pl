import { describe, expect, it } from "vite-plus/test"

import { hasOnlyMarkdownLinksMatching, hasOnlyPublishableMarkdown } from "~/src/modules/content-page/content-page.validation.utils"

describe("hasOnlyPublishableMarkdown", () => {
  it.each([
    "## Returns\n\nWrite to [us](mailto:kontakt@martebizuteria.pl) or read the [FAQ](/faq).",
    "[Form](/forms/formularz_zwrotu.pdf) and [our site](https://martebizuteria.pl/products)",
    "Call [us](tel:+48663150820).",
    String.raw`Write to [us](mailto\:kontakt@martebizuteria.pl), as the editor saves an e-mail link.`,
    String.raw`Escaped \![not an image] and \](not a link)`,
    "Write to :seller[emailLink] or call :seller[phoneLink], NIP :seller[nip].",
    "Seller: :seller[legalName](PL), :seller[street]",
    String.raw`Escaped \:seller[anything] is plain text.`,
  ])("accepts %j", (body) => {
    expect(hasOnlyPublishableMarkdown(body)).toBe(true)
  })

  it.each([
    "![pixel](https://tracker.example/p.gif)",
    "[Click](javascript:alert)",
    "[Form](//evil.example/form.pdf)",
    "[Data](data:text/html;base64,AAAA)",
    String.raw`[Form](/\/evil.example/form.pdf)`,
    String.raw`[Script](javascript\:alert)`,
    "Unknown store detail :seller[iban]",
    "Write to :seller[emailLink] and [click](javascript:alert)",
  ])("rejects %j", (body) => {
    expect(hasOnlyPublishableMarkdown(body)).toBe(false)
  })
})

describe("hasOnlyMarkdownLinksMatching", () => {
  const hasOnlySecureLinks = hasOnlyMarkdownLinksMatching(/^https:\/\//u)

  it("accepts markdown whose every link matches the given pattern", () => {
    expect(hasOnlySecureLinks("Read [the FAQ](https://martebizuteria.pl/faq) and [more](https://martebizuteria.pl).")).toBe(true)
  })

  it("rejects a link the pattern does not allow, even one a content page could publish", () => {
    expect(hasOnlySecureLinks("Read [the FAQ](/faq).")).toBe(false)
  })

  it("rejects an image whatever its address", () => {
    expect(hasOnlySecureLinks("![pixel](https://tracker.example/p.gif)")).toBe(false)
  })
})

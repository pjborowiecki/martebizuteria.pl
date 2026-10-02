import { describe, expect, it } from "vite-plus/test"

import { hasOnlyPublishableMarkdown } from "~/src/modules/content-page/content-page.validation.utils"

describe("hasOnlyPublishableMarkdown", () => {
  it.each([
    "## Returns\n\nWrite to [us](mailto:kontakt@martebizuteria.pl) or read the [FAQ](/faq).",
    "[Form](/forms/formularz_zwrotu.pdf) and [our site](https://martebizuteria.pl/products)",
    "Call [us](tel:+48663150820).",
    String.raw`Escaped \![not an image] and \](not a link)`,
  ])("accepts %j", (body) => {
    expect(hasOnlyPublishableMarkdown(body)).toBe(true)
  })

  it.each([
    "![pixel](https://tracker.example/p.gif)",
    "[Click](javascript:alert)",
    "[Form](//evil.example/form.pdf)",
    "[Data](data:text/html;base64,AAAA)",
  ])("rejects %j", (body) => {
    expect(hasOnlyPublishableMarkdown(body)).toBe(false)
  })
})

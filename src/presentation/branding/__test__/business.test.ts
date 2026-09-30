import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { BUSINESS, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

describe("published business details", () => {
  it.each(I18N.SUPPORTED_LOCALES)("keeps the %s privacy controller consistent with the business identity", async (locale) => {
    const privacy = await readFile(new URL(`../../../../content/legal/privacy-policy.${locale}.mdx`, import.meta.url), "utf8")

    expect(privacy).toContain(BUSINESS.LEGAL_NAME)
    expect(privacy).toContain(BUSINESS.NIP)
    expect(privacy).toContain(`mailto:${BUSINESS.EMAIL}`)
    for (const line of BUSINESS_POSTAL_ADDRESS_LINES) {
      expect(privacy).toContain(line)
    }
  })

  it.each(I18N.SUPPORTED_LOCALES)("uses the same %s returns address and contact email as the business", async (locale) => {
    const returns = await readFile(new URL(`../../../../content/legal/exchanges-and-returns.${locale}.mdx`, import.meta.url), "utf8")

    for (const line of BUSINESS_POSTAL_ADDRESS_LINES) {
      expect(returns).toContain(line)
    }
    expect(returns).toContain(`mailto:${BUSINESS.EMAIL}`)
  })
})

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vite-plus/test"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { BUSINESS, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

const seededBody = (handle: string, locale: string): string => {
  const sqlite = new DatabaseSync(":memory:")
  applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
  const row = sqlite.prepare("select json_extract(bodies, ?) as body from content_page where handle = ?").get(`$."${locale}"`, handle)
  sqlite.close()

  return typeof row?.["body"] === "string" ? row["body"] : ""
}

describe("published business details", () => {
  it.each(I18N.SUPPORTED_LOCALES)("keeps the %s privacy controller consistent with the business identity", (locale) => {
    const privacy = seededBody("privacy-policy", locale)

    expect(privacy).toContain(BUSINESS.LEGAL_NAME)
    expect(privacy).toContain(BUSINESS.NIP)
    expect(privacy).toContain(`mailto:${BUSINESS.EMAIL}`)
    for (const line of BUSINESS_POSTAL_ADDRESS_LINES) {
      expect(privacy).toContain(line)
    }
  })

  it.each(I18N.SUPPORTED_LOCALES)("uses the same %s returns address and contact email as the business", (locale) => {
    const returns = seededBody("exchanges-and-returns", locale)

    for (const line of BUSINESS_POSTAL_ADDRESS_LINES) {
      expect(returns).toContain(line)
    }
    expect(returns).toContain(`mailto:${BUSINESS.EMAIL}`)
  })
})

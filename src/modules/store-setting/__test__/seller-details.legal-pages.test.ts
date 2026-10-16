import { DatabaseSync } from "node:sqlite"
import { afterAll, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { toSellerPhoneHref } from "~/src/modules/store-setting/store-setting.utils"

const sqlite = new DatabaseSync(":memory:")
applyMigration(sqlite, MIGRATION.CONTENT_PAGES)
applyMigration(sqlite, MIGRATION.TERMS_OF_SERVICE_PAGE)
applyMigration(sqlite, MIGRATION.RETURNS_AND_COMPLAINTS_PAGE)
applyMigration(sqlite, MIGRATION.PRIVACY_POLICY_PAGE)
applyMigration(sqlite, MIGRATION.FAQ_PAGE)
applyMigration(sqlite, MIGRATION.STORE_SETTINGS)
applyMigration(sqlite, MIGRATION.SELLER_DETAILS)

const seller = z
  .object({
    city: z.string(),
    email: z.string(),
    legalName: z.string(),
    nip: z.string(),
    phone: z.string(),
    postalCode: z.string(),
    regon: z.string(),
    street: z.string(),
  })
  .parse(
    sqlite
      .prepare(
        `select seller_legal_name as legalName, seller_street as street, seller_postal_code as postalCode, seller_city as city,
          seller_nip as nip, seller_regon as regon, seller_email as email, seller_phone as phone from store_setting`,
      )
      .get(),
  )

const seededBody = (handle: string, locale: string): string =>
  z
    .object({ body: z.string() })
    .parse(sqlite.prepare("select json_extract(bodies, ?) as body from content_page where handle = ?").get(`$."${locale}"`, handle)).body

const POSTAL_ADDRESS_LINES = [seller.legalName, seller.street, `${seller.postalCode} ${seller.city}`]

afterAll(() => {
  sqlite.close()
})

describe("the seller the settings row was filled with", () => {
  it.each(I18N.SUPPORTED_LOCALES)("is the %s privacy policy's data controller, with every detail", (locale) => {
    const privacy = seededBody("privacy-policy", locale)

    for (const detail of [seller.nip, seller.regon, seller.phone, ...POSTAL_ADDRESS_LINES]) {
      expect(privacy).toContain(detail)
    }
    expect(privacy).toContain(`mailto:${seller.email}`)
    expect(privacy).toContain(toSellerPhoneHref(seller.phone))
  })

  it.each(I18N.SUPPORTED_LOCALES)("takes returns in %s at its address and contact email", (locale) => {
    const returns = seededBody("exchanges-and-returns", locale)

    for (const line of POSTAL_ADDRESS_LINES) {
      expect(returns).toContain(line)
    }
    expect(returns).toContain(`mailto:${seller.email}`)
  })

  it.each(I18N.SUPPORTED_LOCALES)("is named in the %s terms of service with every detail", (locale) => {
    const terms = seededBody("terms-of-service", locale)

    for (const detail of [seller.nip, seller.regon, seller.phone, ...POSTAL_ADDRESS_LINES]) {
      expect(terms).toContain(detail)
    }
    expect(terms).toContain(`mailto:${seller.email}`)
    expect(terms).toContain(toSellerPhoneHref(seller.phone))
  })

  it.each(I18N.SUPPORTED_LOCALES)("gives the %s FAQ its contact email and phone", (locale) => {
    const faq = seededBody("faq", locale)

    expect(faq).toContain(`[${seller.email}](mailto:${seller.email})`)
    expect(faq).toContain(`[${seller.phone}](${toSellerPhoneHref(seller.phone)})`)
  })
})

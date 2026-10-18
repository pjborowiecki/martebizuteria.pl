import { type JSX } from "react"

import { cleanup, render } from "@testing-library/react"
import { createMarkdownRenderer } from "fumadocs-core/content/md"
import { remarkGfm } from "fumadocs-core/mdx-plugins/remark-gfm"
import { remarkHeading } from "fumadocs-core/mdx-plugins/remark-heading"
import { DatabaseSync } from "node:sqlite"
import remarkDirective from "remark-directive"
import { afterEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { remarkSellerDetails } from "~/src/presentation/components/custom/pages/content-page/remark-seller-details"

const pageRowsSchema = z.array(z.object({ bodies: z.string(), handle: z.string(), revised_ats: z.string(), updated_at: z.number() }))

const bodiesSchema = z.record(z.string(), z.string())

const sellerSchema = z.object({
  city: z.string(),
  countryCode: z.string(),
  email: z.string(),
  legalName: z.string(),
  nip: z.string(),
  phone: z.string(),
  postalCode: z.string(),
  regon: z.string(),
  street: z.string(),
})

const readPages = (sqlite: DatabaseSync) =>
  pageRowsSchema.parse(sqlite.prepare("select handle, bodies, revised_ats, updated_at from content_page order by handle").all())

const bodyOf = (rows: ReturnType<typeof readPages>, handle: string, locale: SupportedLocale): string =>
  bodiesSchema.parse(JSON.parse(rows.find((row) => row.handle === handle)?.bodies ?? "{}"))[locale] ?? ""

const SQLITE_OPTIONS = { enableDoubleQuotedStringLiterals: true }

const shop = new DatabaseSync(":memory:", SQLITE_OPTIONS)
applyMigrationHistoryBefore(shop, MIGRATION.SELLER_PLACEHOLDERS)
const seeded = readPages(shop)
applyMigration(shop, MIGRATION.SELLER_PLACEHOLDERS)
const migrated = readPages(shop)
const seller = sellerSchema.parse(
  shop
    .prepare(
      `select seller_legal_name as legalName, seller_street as street, seller_postal_code as postalCode, seller_city as city,
        seller_country_code as countryCode, seller_nip as nip, seller_regon as regon, seller_email as email, seller_phone as phone
        from store_setting`,
    )
    .get(),
)
shop.close()

const { Markdown: AsSeeded } = createMarkdownRenderer({ remarkPlugins: [remarkGfm, remarkHeading] })

const renderedHtml = (element: JSX.Element): string => render(element).container.innerHTML

const PAGES = seeded.flatMap(({ handle }) => I18N.SUPPORTED_LOCALES.map((locale) => [handle, locale] as const))

afterEach(cleanup)

describe("the migration that puts placeholders in the seeded legal pages", () => {
  it.each(PAGES)("changes nothing a shopper reads on the %s page in %s", (handle, locale) => {
    const { Markdown: WithSeller } = createMarkdownRenderer({
      remarkPlugins: [remarkGfm, remarkHeading, remarkDirective, [remarkSellerDetails, { locale, seller }]],
    })
    const before = renderedHtml(<AsSeeded>{bodyOf(seeded, handle, locale)}</AsSeeded>)

    expect(bodyOf(migrated, handle, locale)).not.toBe(bodyOf(seeded, handle, locale))
    expect(renderedHtml(<WithSeller>{bodyOf(migrated, handle, locale)}</WithSeller>)).toBe(before)
  })

  it.each(PAGES)("names the seller in the %s page in %s only through placeholders", (handle, locale) => {
    const body = bodyOf(migrated, handle, locale)

    for (const literal of [seller.legalName, seller.nip, seller.regon, seller.email, seller.phone, seller.postalCode]) {
      expect(body).not.toContain(literal)
    }
  })

  it("keeps the pickup sentences in words, where Polish declines the street and the city", () => {
    expect(bodyOf(migrated, "faq", "pl-PL")).toContain("przy ul. Wąskiej 11 w Bochni")
    expect(bodyOf(migrated, "terms-of-service", "en-US")).toContain("at ul. Wąska 11 in Bochnia")
  })

  it("keeps every page's last updated date and edit stamp, since the pages read the same", () => {
    expect(migrated.map(({ handle, revised_ats: revisedAts, updated_at: updatedAt }) => [handle, revisedAts, updatedAt])).toStrictEqual(
      seeded.map(({ handle, revised_ats: revisedAts, updated_at: updatedAt }) => [handle, revisedAts, updatedAt]),
    )
  })

  it("leaves a page the owner rewrote without the seeded details exactly as it is", () => {
    const rewritten = new DatabaseSync(":memory:", SQLITE_OPTIONS)
    applyMigrationHistoryBefore(rewritten, MIGRATION.SELLER_PLACEHOLDERS)
    rewritten.exec("update content_page set bodies = json_object('pl-PL', 'Nasz regulamin.', 'en-US', 'Our terms.') where handle = 'faq'")
    const before = readPages(rewritten)

    applyMigration(rewritten, MIGRATION.SELLER_PLACEHOLDERS)

    expect(readPages(rewritten).find((row) => row.handle === "faq")).toStrictEqual(before.find((row) => row.handle === "faq"))
    rewritten.close()
  })
})

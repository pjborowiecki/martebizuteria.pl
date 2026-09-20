import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"

import { STATIC_PAGES } from "~/src/data/static-pages"
export const buildLocalizedUrl = (appUrl: string, internalPath: string, locale: string): string => {
  if (locale === DEFAULT_LOCALE) {
    return `${appUrl}${internalPath}`
  }
  if (internalPath === "/") {
    return `${appUrl}/${locale}`
  }
  return `${appUrl}/${locale}${internalPath}`
}
export const generateSitemapXml = (appUrl: string): string => {
  const urlEntries = STATIC_PAGES.flatMap((internalPath) =>
    LOCALES.map((locale) => {
      const thisUrl = buildLocalizedUrl(appUrl, internalPath, locale)
      const xDefaultUrl = buildLocalizedUrl(appUrl, internalPath, DEFAULT_LOCALE)
      const alternateLinks = LOCALES.map(
        (altLocale) =>
          `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${buildLocalizedUrl(appUrl, internalPath, altLocale)}"/>`,
      ).join("\n")
      let priority = "0.8"
      if (internalPath === "/") {
        priority = "1.0"
      }
      return `  <url>
    <loc>${thisUrl}</loc>
${alternateLinks}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}"/>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
    }),
  )
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset`,
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `  xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urlEntries,
    `</urlset>`,
  ].join("\n")
}

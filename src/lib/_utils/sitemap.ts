import { CONSTANTS } from "~/src/constants";

export function buildLocalizedUrl(appUrl: string, internalPath: string, locale: string): string {
  if (locale === CONSTANTS.DEFAULT_LOCALE) {
    return `${appUrl}${internalPath}`;
  }

  if (internalPath === "/") {
    return `${appUrl}/${locale}`;
  }

  return `${appUrl}/${locale}${internalPath}`;
}

export function generateSitemapXml(appUrl: string): string {
  const { DEFAULT_LOCALE, LOCALES, STATIC_PAGES } = CONSTANTS;

  const urlEntries = STATIC_PAGES.flatMap((internalPath) =>
    LOCALES.map((locale) => {
      const thisUrl = buildLocalizedUrl(appUrl, internalPath, locale);
      const xDefaultUrl = buildLocalizedUrl(appUrl, internalPath, DEFAULT_LOCALE);

      const alternateLinks = LOCALES.map(
        (altLocale) =>
          `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${buildLocalizedUrl(appUrl, internalPath, altLocale)}"/>`
      ).join("\n");

      let priority = "0.8";
      if (internalPath === "/") {
        priority = "1.0";
      }

      return `  <url>
    <loc>${thisUrl}</loc>
${alternateLinks}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}"/>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset`,
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `  xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urlEntries,
    `</urlset>`
  ].join("\n");
}

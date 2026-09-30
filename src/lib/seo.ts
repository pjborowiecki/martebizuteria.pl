import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { STATIC_PAGES } from "~/src/data/static-pages"

import { APP_NAME, APP_URL, OG_IMAGE_PATH } from "~/src/presentation/branding/app"
import { SOCIALS } from "~/src/presentation/branding/socials"

import { ROUTES } from "~/src/routes"

const TITLE_SEPARATORS: Record<SupportedLocale, string> = {
  "en-US": " — ",
  "pl-PL": " – ",
}

export const buildTitle = ({ locale, title }: { locale: SupportedLocale; title: string }): string =>
  `${title}${TITLE_SEPARATORS[locale]}${APP_NAME}`

const NO_INDEX_PATH_PREFIXES = [ROUTES.ACCOUNT, ROUTES.ADMIN, ROUTES.CHECKOUT] as const

export const isNoIndexPathname = (pathname: string): boolean => {
  const basePath = deLocalizePathname(pathname)

  return NO_INDEX_PATH_PREFIXES.some((prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`))
}

const toAbsoluteUrl = (appUrl: string, pathOrUrl: string): string =>
  pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ? pathOrUrl : `${appUrl}${pathOrUrl}`

const publisherRef = (appUrl: string) => ({ "@id": `${appUrl}#organization` })

export interface PageMeta {
  readonly description: string
  readonly title: string
}

export const pageHead = ({ loaderData }: Readonly<{ loaderData?: Readonly<PageMeta> | undefined }>) => ({
  meta: [
    { title: loaderData?.title ?? APP_NAME },
    { content: loaderData?.description ?? "", name: "description" },
    { content: loaderData?.title ?? APP_NAME, property: "og:title" },
    { content: loaderData?.description ?? "", property: "og:description" },
  ],
})

export const buildPageHead = ({
  canonicalPath,
  description,
  image = OG_IMAGE_PATH,
  locale,
  publishedTime,
  structuredData,
  title,
  type,
}: {
  readonly canonicalPath: string
  readonly description: string
  readonly image?: string
  readonly locale: SupportedLocale
  readonly publishedTime?: string
  readonly structuredData: object
  readonly title: string
  readonly type: "article" | "product" | "website"
}) => {
  const appUrl = APP_URL
  const pageTitle = buildTitle({ locale, title })
  const localizedPath = localizePathname({ locale, pathname: canonicalPath })
  const canonicalUrl = `${appUrl}${localizedPath}`
  const imageUrl = toAbsoluteUrl(appUrl, image)

  return {
    links: [...localeLinks({ origin: appUrl, pathname: localizedPath })],
    meta: [
      { title: pageTitle },
      { content: description, name: "description" },
      { content: pageTitle, property: "og:title" },
      { content: description, property: "og:description" },
      { content: type, property: "og:type" },
      { content: canonicalUrl, property: "og:url" },
      { content: locale, property: "og:locale" },
      ...I18N.SUPPORTED_LOCALES.filter((alternate) => alternate !== locale).map((alternate) => ({
        content: alternate,
        property: "og:locale:alternate",
      })),
      { content: imageUrl, property: "og:image" },
      { content: pageTitle, property: "og:image:alt" },
      { content: pageTitle, name: "twitter:title" },
      { content: description, name: "twitter:description" },
      { content: imageUrl, name: "twitter:image" },
      ...(publishedTime === undefined
        ? []
        : [
            { content: publishedTime, property: "article:published_time" },
            { content: APP_NAME, property: "article:author" },
          ]),
      { "script:ld+json": structuredData },
    ],
  }
}

export const buildWebPageStructuredData = ({
  canonicalPath,
  description,
  locale,
  title,
}: {
  readonly canonicalPath: string
  readonly description: string
  readonly locale: SupportedLocale
  readonly title: string
}) => {
  const appUrl = APP_URL

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    description,
    inLanguage: locale,
    isPartOf: { "@id": `${appUrl}#website` },
    name: title,
    publisher: publisherRef(appUrl),
    url: `${appUrl}${localizePathname({ locale, pathname: canonicalPath })}`,
  }
}

export const buildStoreStructuredData = ({ description, locale }: { readonly description: string; readonly locale: SupportedLocale }) => {
  const appUrl = APP_URL

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${appUrl}#website`,
        "@type": "WebSite",
        description,
        inLanguage: locale,
        name: APP_NAME,
        publisher: publisherRef(appUrl),
        url: appUrl,
      },
      {
        "@id": `${appUrl}#organization`,
        "@type": "OnlineStore",
        description,
        name: APP_NAME,
        sameAs: [SOCIALS.FACEBOOK, SOCIALS.INSTAGRAM],
        url: appUrl,
      },
    ],
  }
}

export const buildBlogStructuredData = ({
  canonicalPath,
  description,
  locale,
  posts,
  title,
}: {
  readonly canonicalPath: string
  readonly description: string
  readonly locale: SupportedLocale
  readonly posts: readonly {
    readonly description: string
    readonly path: string
    readonly title: string
  }[]
  readonly title: string
}) => {
  const appUrl = APP_URL

  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      abstract: post.description,
      headline: post.title,
      url: `${appUrl}${localizePathname({ locale, pathname: post.path })}`,
    })),
    description,
    inLanguage: locale,
    isPartOf: { "@id": `${appUrl}#website` },
    name: title,
    publisher: publisherRef(appUrl),
    url: `${appUrl}${localizePathname({ locale, pathname: canonicalPath })}`,
  }
}

const BREADCRUMB_HOME = 1

const BREADCRUMB_SECTION = 2

const BREADCRUMB_LEAF = 3

const buildBreadcrumbs = ({
  appUrl,
  leaf,
  locale,
  section,
  sectionPath,
}: {
  appUrl: string
  leaf: string
  locale: SupportedLocale
  section: string
  sectionPath: string
}) => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      item: `${appUrl}${localizePathname({ locale, pathname: ROUTES.HOME })}`,
      name: APP_NAME,
      position: BREADCRUMB_HOME,
    },
    {
      "@type": "ListItem",
      item: `${appUrl}${localizePathname({ locale, pathname: sectionPath })}`,
      name: section,
      position: BREADCRUMB_SECTION,
    },
    { "@type": "ListItem", name: leaf, position: BREADCRUMB_LEAF },
  ],
})

export const buildBlogPostStructuredData = ({
  canonicalPath,
  date,
  description,
  image = OG_IMAGE_PATH,
  locale,
  section,
  sectionPath,
  title,
}: {
  readonly canonicalPath: string
  readonly date: string
  readonly description: string
  readonly image?: string
  readonly locale: SupportedLocale
  readonly section: string
  readonly sectionPath: string
  readonly title: string
}) => {
  const appUrl = APP_URL
  const canonicalUrl = `${appUrl}${localizePathname({ locale, pathname: canonicalPath })}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        author: { "@id": `${appUrl}#organization` },
        dateModified: date,
        datePublished: date,
        description,
        headline: title,
        image: toAbsoluteUrl(appUrl, image),
        inLanguage: locale,
        isPartOf: { "@id": `${appUrl}#website` },
        mainEntityOfPage: { "@id": canonicalUrl, "@type": "WebPage" },
        publisher: publisherRef(appUrl),
        url: canonicalUrl,
      },
      buildBreadcrumbs({ appUrl, leaf: title, locale, section, sectionPath }),
    ],
  }
}

export const buildProductStructuredData = ({
  availability,
  canonicalPath,
  currency,
  description,
  images,
  locale,
  price,
  section,
  sectionPath,
  sku,
  title,
}: {
  readonly availability: "InStock" | "OutOfStock" | "PreOrder"
  readonly canonicalPath: string
  readonly currency: string
  readonly description: string
  readonly images: readonly string[]
  readonly locale: SupportedLocale
  readonly price: string
  readonly section: string
  readonly sectionPath: string
  readonly sku: string
  readonly title: string
}) => {
  const appUrl = APP_URL
  const canonicalUrl = `${appUrl}${localizePathname({ locale, pathname: canonicalPath })}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        brand: { "@id": `${appUrl}#organization` },
        description,
        image: images.map((image) => toAbsoluteUrl(appUrl, image)),
        name: title,
        offers: {
          "@type": "Offer",
          availability: `https://schema.org/${availability}`,
          price,
          priceCurrency: currency,
          seller: { "@id": `${appUrl}#organization` },
          url: canonicalUrl,
        },
        sku,
        url: canonicalUrl,
      },
      buildBreadcrumbs({ appUrl, leaf: title, locale, section, sectionPath }),
    ],
  }
}

export const buildLocalizedUrl = (appUrl: string, internalPath: string, locale: string): string => {
  if (locale === I18N.DEFAULT_LOCALE) {
    return `${appUrl}${internalPath}`
  }

  if (internalPath === "/") {
    return `${appUrl}/${locale}`
  }

  return `${appUrl}/${locale}${internalPath}`
}

const DISALLOWED_PATH_PREFIXES = ["/api/", ROUTES.ADMIN, ROUTES.ACCOUNT, ROUTES.CHECKOUT] as const

export const generateRobotsTxt = (appUrl: string, appEnv: string): string => {
  if (appEnv !== "production") {
    return "User-agent: *\nDisallow: /\n"
  }

  const disallowLines = DISALLOWED_PATH_PREFIXES.map((path) => `Disallow: ${path}`).join("\n")

  return `User-agent: *\nAllow: /\n${disallowLines}\n\nSitemap: ${appUrl}/sitemap.xml\n`
}

export const generateSitemapXml = (appUrl: string): string => {
  const urlEntries = STATIC_PAGES.flatMap((internalPath) =>
    I18N.SUPPORTED_LOCALES.map((locale) => {
      const thisUrl = buildLocalizedUrl(appUrl, internalPath, locale)
      const xDefaultUrl = buildLocalizedUrl(appUrl, internalPath, I18N.DEFAULT_LOCALE)
      const alternateLinks = I18N.SUPPORTED_LOCALES.map(
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

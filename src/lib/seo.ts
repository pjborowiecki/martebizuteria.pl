import { type QueryClient } from "@tanstack/react-query"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { deLocalizePathname, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToNumberInput } from "~/src/modules/_core/utils/currency"
import { getVariantQuantityAvailable } from "~/src/modules/inventory/inventory.utils"
import { type Product } from "~/src/modules/product/product.types"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { APP_NAME, APP_URL, OG_IMAGE_PATH } from "~/src/presentation/branding/app"
import { SOCIALS } from "~/src/presentation/branding/socials"

import type accountMessages from "~/messages/en-US/pages.account.json"
import type accountMetaMessages from "~/messages/en-US/pages.account.meta.json"
import { ROUTES } from "~/src/routes"

export type AccountSection = keyof (typeof accountMessages)["sidebar"]

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

const toPostalAddress = ({ city, countryCode, postalCode, street }: StoreSetting["sellerDetails"]) => ({
  "@type": "PostalAddress",
  addressCountry: countryCode,
  addressLocality: city,
  postalCode,
  streetAddress: street,
})

export interface PageMeta {
  readonly description: string
  readonly image?: string | undefined
  readonly structuredData?: object | undefined
  readonly title: string
}

export const pageHead = ({ loaderData }: Readonly<{ loaderData?: Readonly<PageMeta> | undefined }>) => ({
  meta: [
    { title: loaderData?.title ?? APP_NAME },
    { content: loaderData?.description ?? "", name: "description" },
    { content: loaderData?.title ?? APP_NAME, property: "og:title" },
    { content: loaderData?.description ?? "", property: "og:description" },
    ...(loaderData?.image === undefined
      ? []
      : [
          { content: loaderData.image, property: "og:image" },
          { content: loaderData.title, property: "og:image:alt" },
          { content: loaderData.image, name: "twitter:image" },
        ]),
    ...(loaderData?.structuredData === undefined ? [] : [{ "script:ld+json": loaderData.structuredData }]),
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

export const buildStoreStructuredData = ({
  description,
  locale,
  seller,
}: {
  readonly description: string
  readonly locale: SupportedLocale
  readonly seller: StoreSetting["sellerDetails"]
}) => {
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
        address: toPostalAddress(seller),
        description,
        email: seller.email,
        legalName: seller.legalName,
        name: APP_NAME,
        sameAs: [SOCIALS.FACEBOOK, SOCIALS.INSTAGRAM],
        taxID: seller.nip,
        telephone: seller.phone,
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

interface BreadcrumbTrail {
  readonly leaf: string
  readonly locale: SupportedLocale
  readonly sections: readonly { readonly name: string; readonly path: string }[]
}

const buildBreadcrumbs = ({ leaf, locale, sections }: BreadcrumbTrail) => {
  const linked = [{ name: APP_NAME, path: ROUTES.HOME }, ...sections]

  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      ...linked.map(({ name, path }, index) => ({
        "@type": "ListItem",
        item: `${APP_URL}${localizePathname({ locale, pathname: path })}`,
        name,
        position: index + 1,
      })),
      { "@type": "ListItem", name: leaf, position: linked.length + 1 },
    ],
  }
}

export const buildBreadcrumbStructuredData = (trail: BreadcrumbTrail) => ({
  "@context": "https://schema.org",
  ...buildBreadcrumbs(trail),
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
      buildBreadcrumbs({ leaf: title, locale, sections: [{ name: section, path: sectionPath }] }),
    ],
  }
}

export const buildProductStructuredData = ({
  images,
  locale,
  product,
  section,
  seller,
}: {
  readonly images: readonly string[]
  readonly locale: SupportedLocale
  readonly product: Product["storefront"]
  readonly section: string
  readonly seller: StoreSetting["sellerDetails"]
}) => {
  const canonicalUrl = `${APP_URL}${localizePathname({ locale, pathname: ROUTES.PRODUCT.replace("$handle", product.handle) })}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        brand: { "@type": "Brand", name: APP_NAME },
        description: product.description,
        image: images,
        manufacturer: { "@type": "Organization", address: toPostalAddress(seller), email: seller.email, name: seller.legalName },
        name: product.title,
        offers: product.variants.map((variant) => ({
          "@type": "Offer",
          availability: `https://schema.org/${getVariantQuantityAvailable(variant) > 0 ? "InStock" : "OutOfStock"}`,
          price: formatMinorUnitsToNumberInput(variant.price, STORE_CURRENCY_CODE),
          priceCurrency: STORE_CURRENCY_CODE,
          seller: publisherRef(APP_URL),
          ...(variant.sku === null ? {} : { sku: variant.sku }),
          url: canonicalUrl,
        })),
        url: canonicalUrl,
      },
      buildBreadcrumbs({ leaf: product.title, locale, sections: [{ name: section, path: ROUTES.PRODUCTS }] }),
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

export interface SitemapPage {
  readonly lastModified?: Date
  readonly path: string
}

const sitemapUrlEntry = (appUrl: string, { lastModified, path }: SitemapPage, locale: SupportedLocale): string =>
  [
    "  <url>",
    `    <loc>${buildLocalizedUrl(appUrl, path, locale)}</loc>`,
    ...(lastModified === undefined ? [] : [`    <lastmod>${lastModified.toISOString()}</lastmod>`]),
    "    <changefreq>weekly</changefreq>",
    `    <priority>${path === ROUTES.HOME ? "1.0" : "0.8"}</priority>`,
    ...I18N.SUPPORTED_LOCALES.map(
      (alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate}" href="${buildLocalizedUrl(appUrl, path, alternate)}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildLocalizedUrl(appUrl, path, I18N.DEFAULT_LOCALE)}"/>`,
    "  </url>",
  ].join("\n")

export const generateSitemapXml = (appUrl: string, pages: readonly SitemapPage[]): string =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset`,
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `  xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...pages.flatMap((page) => I18N.SUPPORTED_LOCALES.map((locale) => sitemapUrlEntry(appUrl, page, locale))),
    `</urlset>`,
  ].join("\n")

export const accountPageMeta = async (queryClient: QueryClient, locale: SupportedLocale, section: AccountSection): Promise<PageMeta> => {
  const [sections, meta] = await Promise.all([
    queryClient.query(messagesQueryOptions<typeof accountMessages>({ locale, namespace: "pages.account" })),
    queryClient.query(messagesQueryOptions<typeof accountMetaMessages>({ locale, namespace: "pages.account.meta" })),
  ])

  return {
    description: meta.description,
    title: `${sections.sidebar[section]} | ${APP_NAME}`,
  }
}

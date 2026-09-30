import { describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { STATIC_PAGES } from "~/src/data/static-pages"

import {
  buildLocalizedUrl,
  buildPageHead,
  buildTitle,
  generateRobotsTxt,
  generateSitemapXml,
  isNoIndexPathname,
  pageHead,
} from "~/src/lib/seo"

import { APP_NAME, APP_URL, OG_IMAGE_PATH } from "~/src/presentation/branding/app"

const { env } = vi.hoisted(() => ({
  env: { VITE_R2_URL: "" },
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("buildTitle", () => {
  it.each([
    ["pl-PL" as const, `Kolczyki – ${APP_NAME}`],
    ["en-US" as const, `Kolczyki — ${APP_NAME}`],
  ])("uses the %s separator", (locale, expected) => {
    expect(buildTitle({ locale, title: "Kolczyki" })).toBe(expected)
  })
})

describe("isNoIndexPathname", () => {
  it.each([["/admin"], ["/admin/orders"], ["/account/overview"], ["/checkout"], ["/en-US/account/orders"], ["/en-US/checkout"]])(
    "keeps %s out of the index",
    (pathname) => {
      expect(isNoIndexPathname(pathname)).toBe(true)
    },
  )

  it.each([["/"], ["/products"], ["/en-US/products/silver-ring"], ["/accounts-payable"], ["/blog"]])("leaves %s indexable", (pathname) => {
    expect(isNoIndexPathname(pathname)).toBe(false)
  })
})

describe("buildPageHead", () => {
  const head = buildPageHead({
    canonicalPath: "/products/silver-ring",
    description: "Ręcznie wykonany pierścionek ze srebra 925.",
    locale: "pl-PL",
    structuredData: {},
    title: "Pierścionek",
    type: "product",
  })

  it("advertises an absolute social image so the large-image card resolves", () => {
    expect(head.meta).toContainEqual({
      content: `${APP_URL}${OG_IMAGE_PATH}`,
      property: "og:image",
    })
    expect(head.meta).toContainEqual({
      content: `${APP_URL}${OG_IMAGE_PATH}`,
      name: "twitter:image",
    })
  })

  it("points og:url and the canonical link at the same localized URL", () => {
    expect(head.meta).toContainEqual({
      content: `${APP_URL}/products/silver-ring`,
      property: "og:url",
    })
    expect(head.links).toContainEqual({
      href: `${APP_URL}/products/silver-ring`,
      rel: "canonical",
    })
  })

  it("declares the other locales as open graph alternates", () => {
    expect(head.meta).toContainEqual({ content: "en-US", property: "og:locale:alternate" })
    expect(head.meta).not.toContainEqual({ content: "pl-PL", property: "og:locale:alternate" })
  })
})

describe("buildLocalizedUrl", () => {
  it("leaves the default locale unprefixed", () => {
    expect(buildLocalizedUrl(APP_URL, "/about", I18N.DEFAULT_LOCALE)).toBe(`${APP_URL}/about`)
    expect(buildLocalizedUrl(APP_URL, "/", I18N.DEFAULT_LOCALE)).toBe(`${APP_URL}/`)
  })

  it("prefixes other locales without leaving a trailing slash on the home page", () => {
    expect(buildLocalizedUrl(APP_URL, "/", "en-US")).toBe(`${APP_URL}/en-US`)
    expect(buildLocalizedUrl(APP_URL, "/about", "en-US")).toBe(`${APP_URL}/en-US/about`)
  })
})

describe("generateRobotsTxt", () => {
  it.each([["preview"], ["development"], [""]])("blocks every crawler in the %j environment", (appEnv) => {
    expect(generateRobotsTxt(APP_URL, appEnv)).toBe("User-agent: *\nDisallow: /\n")
  })

  it("allows crawling in production", () => {
    expect(generateRobotsTxt(APP_URL, "production")).toContain("Allow: /")
  })

  it.each([["/api/"], ["/admin"], ["/account"], ["/checkout"]])("disallows %s in production", (path) => {
    expect(generateRobotsTxt(APP_URL, "production")).toContain(`Disallow: ${path}`)
  })

  it("points crawlers at the sitemap in production only", () => {
    expect(generateRobotsTxt(APP_URL, "production")).toContain(`Sitemap: ${APP_URL}/sitemap.xml`)
    expect(generateRobotsTxt(APP_URL, "preview")).not.toContain("Sitemap:")
  })
})

describe("generateSitemapXml", () => {
  const xml = generateSitemapXml(APP_URL)

  it("emits one url entry per static page and locale", () => {
    expect(xml.match(/<url>/gu)).toHaveLength(STATIC_PAGES.length * I18N.SUPPORTED_LOCALES.length)
  })

  it("declares the xhtml namespace the alternate links rely on", () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })

  it("cross-links every locale of a page plus an x-default", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="${locale}" href="${buildLocalizedUrl(APP_URL, "/about", locale)}"/>`)
    }

    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${APP_URL}/about"/>`)
  })

  it("ranks the home page above the other static pages", () => {
    expect(xml).toContain("<priority>1.0</priority>")
    expect(xml).toContain("<priority>0.8</priority>")
    expect(xml.match(/<priority>1\.0<\/priority>/gu)).toHaveLength(I18N.SUPPORTED_LOCALES.length)
  })

  it("opens with the XML declaration and closes the urlset", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml.endsWith("</urlset>")).toBe(true)
  })
})

describe("pageHead", () => {
  it("mirrors the loaded title and description into the tag and the open graph pair", () => {
    expect(pageHead({ loaderData: { description: "Manage your orders", title: "Your account" } })).toStrictEqual({
      meta: [
        { title: "Your account" },
        { content: "Manage your orders", name: "description" },
        { content: "Your account", property: "og:title" },
        { content: "Manage your orders", property: "og:description" },
      ],
    })
  })

  it("falls back to the app name and an empty description before the loader has run", () => {
    expect(pageHead({})).toStrictEqual({
      meta: [
        { title: APP_NAME },
        { content: "", name: "description" },
        { content: APP_NAME, property: "og:title" },
        { content: "", property: "og:description" },
      ],
    })
  })
})

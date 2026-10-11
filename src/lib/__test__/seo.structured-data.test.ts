import { describe, expect, it, vi } from "vite-plus/test"

import {
  buildBlogPostStructuredData,
  buildBlogStructuredData,
  buildBreadcrumbStructuredData,
  buildPageHead,
  buildProductStructuredData,
  buildStoreStructuredData,
  buildWebPageStructuredData,
} from "~/src/lib/seo"

import { APP_NAME, APP_URL, OG_IMAGE_PATH } from "~/src/presentation/branding/app"
import { BUSINESS } from "~/src/presentation/branding/business"
import { SOCIALS } from "~/src/presentation/branding/socials"

import {
  storefrontProduct,
  storefrontVariant,
} from "~/src/presentation/components/custom/pages/product-page/__test__/storefront-product-fixture"

const { env } = vi.hoisted(() => ({ env: { VITE_R2_URL: "" } }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("buildWebPageStructuredData", () => {
  it("ties the page to the site and organization nodes of the store graph", () => {
    expect(
      buildWebPageStructuredData({
        canonicalPath: "/faq",
        description: "Najczęstsze pytania.",
        locale: "pl-PL",
        title: "FAQ",
      }),
    ).toStrictEqual({
      "@context": "https://schema.org",
      "@type": "WebPage",
      description: "Najczęstsze pytania.",
      inLanguage: "pl-PL",
      isPartOf: { "@id": `${APP_URL}#website` },
      name: "FAQ",
      publisher: { "@id": `${APP_URL}#organization` },
      url: `${APP_URL}/faq`,
    })
  })

  it("prefixes the url for a non-default locale", () => {
    expect(
      buildWebPageStructuredData({
        canonicalPath: "/faq",
        description: "Frequently asked questions.",
        locale: "en-US",
        title: "FAQ",
      }).url,
    ).toBe(`${APP_URL}/en-US/faq`)
  })
})

describe("buildStoreStructuredData", () => {
  const graph = buildStoreStructuredData({ description: "Srebrna biżuteria.", locale: "pl-PL" })["@graph"]

  it("declares the website node the other builders reference", () => {
    expect(graph[0]).toStrictEqual({
      "@id": `${APP_URL}#website`,
      "@type": "WebSite",
      description: "Srebrna biżuteria.",
      inLanguage: "pl-PL",
      name: APP_NAME,
      publisher: { "@id": `${APP_URL}#organization` },
      url: APP_URL,
    })
  })

  it("declares the online store node with both social profiles", () => {
    expect(graph[1]).toMatchObject({
      "@id": `${APP_URL}#organization`,
      "@type": "OnlineStore",
      name: APP_NAME,
      sameAs: [SOCIALS.FACEBOOK, SOCIALS.INSTAGRAM],
      url: APP_URL,
    })
  })

  it("names the business behind the store with its address, contacts and tax number", () => {
    expect(graph[1]).toMatchObject({
      address: {
        "@type": "PostalAddress",
        addressCountry: "PL",
        addressLocality: "Bochnia",
        postalCode: "32-700",
        streetAddress: "ul. Wąska 11",
      },
      email: BUSINESS.EMAIL,
      legalName: BUSINESS.LEGAL_NAME,
      taxID: BUSINESS.NIP,
      telephone: BUSINESS.PHONE,
    })
  })
})

describe("buildBreadcrumbStructuredData", () => {
  it("walks from the store through each linked section to the current page", () => {
    expect(
      buildBreadcrumbStructuredData({ leaf: "Rings", locale: "pl-PL", sections: [{ name: "Kategorie", path: "/categories" }] }),
    ).toStrictEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: `${APP_URL}/`, name: APP_NAME, position: 1 },
        { "@type": "ListItem", item: `${APP_URL}/categories`, name: "Kategorie", position: 2 },
        { "@type": "ListItem", name: "Rings", position: 3 },
      ],
    })
  })

  it("links the store in the reader's locale and leaves the current page unlinked", () => {
    expect(buildBreadcrumbStructuredData({ leaf: "All Products", locale: "en-US", sections: [] }).itemListElement).toStrictEqual([
      { "@type": "ListItem", item: `${APP_URL}/en-US`, name: APP_NAME, position: 1 },
      { "@type": "ListItem", name: "All Products", position: 2 },
    ])
  })
})

describe("buildBlogStructuredData", () => {
  const blog = buildBlogStructuredData({
    canonicalPath: "/blog",
    description: "Dziennik marki.",
    locale: "en-US",
    posts: [
      { description: "Jak dbać o srebro.", path: "/blog/silver-care", title: "Silver care" },
      { description: "Nowa kolekcja.", path: "/blog/new-collection", title: "New collection" },
    ],
    title: "Journal",
  })

  it("localizes the blog url and every post url", () => {
    expect(blog.url).toBe(`${APP_URL}/en-US/blog`)
    expect(blog.blogPost.map((post) => post.url)).toStrictEqual([
      `${APP_URL}/en-US/blog/silver-care`,
      `${APP_URL}/en-US/blog/new-collection`,
    ])
  })

  it("maps each post description onto the abstract and the title onto the headline", () => {
    expect(blog.blogPost[0]).toStrictEqual({
      "@type": "BlogPosting",
      abstract: "Jak dbać o srebro.",
      headline: "Silver care",
      url: `${APP_URL}/en-US/blog/silver-care`,
    })
  })

  it("keeps an empty journal free of post entries", () => {
    expect(
      buildBlogStructuredData({
        canonicalPath: "/blog",
        description: "Dziennik marki.",
        locale: "pl-PL",
        posts: [],
        title: "Journal",
      }).blogPost,
    ).toStrictEqual([])
  })
})

describe("buildBlogPostStructuredData", () => {
  const graph = buildBlogPostStructuredData({
    canonicalPath: "/blog/silver-care",
    date: "2026-01-15",
    description: "Jak dbać o srebro.",
    locale: "pl-PL",
    section: "Journal",
    sectionPath: "/blog",
    title: "Silver care",
  })["@graph"]

  it("publishes the same date as created and modified and points at the canonical page", () => {
    expect(graph[0]).toMatchObject({
      "@type": "BlogPosting",
      author: { "@id": `${APP_URL}#organization` },
      dateModified: "2026-01-15",
      datePublished: "2026-01-15",
      headline: "Silver care",
      image: `${APP_URL}${OG_IMAGE_PATH}`,
      mainEntityOfPage: { "@id": `${APP_URL}/blog/silver-care`, "@type": "WebPage" },
      url: `${APP_URL}/blog/silver-care`,
    })
  })

  it("keeps an already absolute social image untouched", () => {
    const [posting] = buildBlogPostStructuredData({
      canonicalPath: "/blog/silver-care",
      date: "2026-01-15",
      description: "Jak dbać o srebro.",
      image: "https://cdn.test/post.jpg",
      locale: "pl-PL",
      section: "Journal",
      sectionPath: "/blog",
      title: "Silver care",
    })["@graph"]

    expect(posting).toMatchObject({ image: "https://cdn.test/post.jpg" })
  })

  it("walks the breadcrumb from the store through the section to the post", () => {
    expect(graph[1]).toStrictEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: `${APP_URL}/`, name: APP_NAME, position: 1 },
        { "@type": "ListItem", item: `${APP_URL}/blog`, name: "Journal", position: 2 },
        { "@type": "ListItem", name: "Silver care", position: 3 },
      ],
    })
  })
})

describe("buildProductStructuredData", () => {
  const ring = storefrontProduct({
    description: "Pierścionek ze srebra 925.",
    variants: [
      storefrontVariant({ id: "variant-small", price: 24_900, quantityAvailable: 2, sku: "RING-925-S" }),
      storefrontVariant({ id: "variant-large", price: 26_900, quantityAvailable: 0, sku: null }),
    ],
  })
  const images = ["https://images.example.test/products/ring.webp", "https://images.example.test/products/ring-side.webp"]
  const [product, breadcrumbs] = buildProductStructuredData({ images, locale: "en-US", product: ring, section: "Products" })["@graph"]

  it("describes the product under the store's brand with its images", () => {
    expect(product).toMatchObject({
      "@type": "Product",
      brand: { "@type": "Brand", name: APP_NAME },
      description: "Pierścionek ze srebra 925.",
      image: images,
      name: "Silver ring",
      url: `${APP_URL}/en-US/products/silver-ring`,
    })
  })

  it("names the manufacturer with the postal and e-mail address the product page shows", () => {
    expect(product).toMatchObject({
      manufacturer: {
        "@type": "Organization",
        address: {
          "@type": "PostalAddress",
          addressCountry: "PL",
          addressLocality: "Bochnia",
          postalCode: "32-700",
          streetAddress: "ul. Wąska 11",
        },
        email: BUSINESS.EMAIL,
        name: BUSINESS.LEGAL_NAME,
      },
    })
  })

  it("offers every variant at its price in zloty with the availability its stock allows", () => {
    expect(product).toMatchObject({
      offers: [
        {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          price: "249.00",
          priceCurrency: "PLN",
          seller: { "@id": `${APP_URL}#organization` },
          sku: "RING-925-S",
          url: `${APP_URL}/en-US/products/silver-ring`,
        },
        {
          "@type": "Offer",
          availability: "https://schema.org/OutOfStock",
          price: "269.00",
          priceCurrency: "PLN",
          seller: { "@id": `${APP_URL}#organization` },
          url: `${APP_URL}/en-US/products/silver-ring`,
        },
      ],
    })
  })

  it("leaves the sku out of the published json for a variant without one", () => {
    expect(JSON.stringify(product).match(/"sku":/gu)).toStrictEqual(['"sku":'])
  })

  it("treats a variant with no inventory row as out of stock", () => {
    const [untracked] = buildProductStructuredData({
      images: [],
      locale: "pl-PL",
      product: storefrontProduct({ variants: [storefrontVariant({ inventory: null })] }),
      section: "Produkty",
    })["@graph"]

    expect(untracked).toMatchObject({ offers: [{ availability: "https://schema.org/OutOfStock", price: "1200.00" }] })
  })

  it("walks the breadcrumb from the store through the catalogue to the product", () => {
    expect(breadcrumbs).toStrictEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: `${APP_URL}/en-US`, name: APP_NAME, position: 1 },
        { "@type": "ListItem", item: `${APP_URL}/en-US/products`, name: "Products", position: 2 },
        { "@type": "ListItem", name: "Silver ring", position: 3 },
      ],
    })
  })
})

describe("buildPageHead", () => {
  it("adds the article metadata only when a published time is supplied", () => {
    const article = buildPageHead({
      canonicalPath: "/blog/silver-care",
      description: "Jak dbać o srebro.",
      locale: "pl-PL",
      publishedTime: "2026-01-15T10:00:00.000Z",
      structuredData: { "@type": "BlogPosting" },
      title: "Silver care",
      type: "article",
    })

    expect(article.meta).toContainEqual({ content: "2026-01-15T10:00:00.000Z", property: "article:published_time" })
    expect(article.meta).toContainEqual({ content: APP_NAME, property: "article:author" })
  })

  it("omits the article metadata for an undated page", () => {
    const page = buildPageHead({
      canonicalPath: "/faq",
      description: "Najczęstsze pytania.",
      locale: "pl-PL",
      structuredData: {},
      title: "FAQ",
      type: "website",
    })

    expect(page.meta.some((entry) => "property" in entry && entry.property === "article:published_time")).toBe(false)
  })

  it("carries the structured data through as the last json-ld entry", () => {
    const structuredData = { "@type": "WebPage" }
    const page = buildPageHead({
      canonicalPath: "/faq",
      description: "Najczęstsze pytania.",
      locale: "pl-PL",
      structuredData,
      title: "FAQ",
      type: "website",
    })

    expect(page.meta.at(-1)).toStrictEqual({ "script:ld+json": structuredData })
  })

  it("keeps an absolute social image absolute", () => {
    const page = buildPageHead({
      canonicalPath: "/faq",
      description: "Najczęstsze pytania.",
      image: "https://cdn.test/faq.png",
      locale: "pl-PL",
      structuredData: {},
      title: "FAQ",
      type: "website",
    })

    expect(page.meta).toContainEqual({ content: "https://cdn.test/faq.png", property: "og:image" })
  })

  it("titles the social card with the same suffixed title as the document", () => {
    const page = buildPageHead({
      canonicalPath: "/faq",
      description: "Najczęstsze pytania.",
      locale: "pl-PL",
      structuredData: {},
      title: "FAQ",
      type: "website",
    })

    expect(page.meta).toContainEqual({ title: `FAQ – ${APP_NAME}` })
    expect(page.meta).toContainEqual({ content: `FAQ – ${APP_NAME}`, name: "twitter:title" })
    expect(page.meta).toContainEqual({ content: `FAQ – ${APP_NAME}`, property: "og:image:alt" })
  })
})

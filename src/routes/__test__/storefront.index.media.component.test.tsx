import { renderToString } from "react-dom/server"

import { QueryClient } from "@tanstack/react-query"
import { beforeAll, describe, expect, it, vi } from "vite-plus/test"

const catalog = vi.hoisted(() => ({
  categories: ["necklaces", "bracelets", "earrings", "rings", "chokers"].map((handle, index) => ({
    descriptions: null,
    handle,
    id: `cat_${String(index)}`,
    image: `https://images.test/categories/${handle}.webp`,
    productCount: index + 1,
    shortDescriptions: { "en-US": `${handle} short`, "pl-PL": `${handle} krotko` },
    subtitles: { "en-US": `${handle} subtitle`, "pl-PL": `${handle} podtytul` },
    titles: { "en-US": handle, "pl-PL": handle },
  })),
  collections: ["serenity", "aurora"].map((handle, index) => ({
    descriptions: null,
    handle,
    id: `col_${String(index)}`,
    image: `https://images.test/collections/${handle}.webp`,
    shortDescriptions: null,
    titles: { "en-US": handle, "pl-PL": handle },
  })),
  newArrivals: ["silver-ring", "gold-choker", "pearl-earrings", "shell-pendant", "moon-necklace", "coin-bracelet"].map((handle, index) => ({
    handle,
    id: `prod_${String(index)}`,
    subtitles: { "en-US": `${handle} subtitle`, "pl-PL": `${handle} podtytul` },
    thumbnail: `https://images.test/products/${handle}.webp`,
    titles: { "en-US": handle, "pl-PL": handle },
    variants: [{ id: `var_${String(index)}`, price: 25_000, title: "Default" }],
  })),
}))

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/hooks/use-wishlist", () => ({
  useWishlist: () => ({ isWishlisted: () => false, signedIn: false, toggle: vi.fn() }),
}))
vi.mock("~/src/modules/user/use-cases/record-customer-activity", () => ({
  recordCustomerActivity: () => Promise.resolve({ ok: true, recorded: false }),
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter", () => ({
  subscribeToNewsletterMutation: { mutationFn: vi.fn(), mutationKey: ["newsletter", "subscribe"] },
}))
vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({
  getNewArrivalsQuery: () => ({ queryFn: () => Promise.resolve(catalog.newArrivals), queryKey: ["new-arrivals"] }),
}))
vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve(catalog.categories), queryKey: ["categories"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve(catalog.collections), queryKey: ["collections"] }),
}))

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { loadGsap } from "~/src/integrations/gsap/gsap.loader"

import { Route } from "~/src/routes/_storefront.index"

const renderLandingPage = (): string => {
  const HomePage = Route.options.component
  if (HomePage === undefined) {
    throw new Error("the landing route registered no component")
  }
  const queryClient = new QueryClient()
  queryClient.setQueryData(["new-arrivals"], catalog.newArrivals)
  queryClient.setQueryData(["categories"], catalog.categories)
  queryClient.setQueryData(["collections"], catalog.collections)

  return renderToString(
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      <HomePage />
    </TestProviders>,
  )
}

const tagsNamed = (html: string, pattern: RegExp): string[] => html.match(pattern) ?? []

describe("landing page media in the server-rendered html", () => {
  beforeAll(async () => {
    await loadGsap()
  })

  it("preloads one image, the hero, at high priority", () => {
    const imagePreloads = tagsNamed(renderLandingPage(), /<link rel="preload" as="image"[^>]*>/gu)

    expect(imagePreloads).toHaveLength(1)
    expect(imagePreloads[0]).toContain("marketing/hero.webp")
    expect(imagePreloads[0]).toContain('fetchPriority="high"')
  })

  it("loads every image below the hero lazily, at default priority and with asynchronous decoding", () => {
    const images = tagsNamed(renderLandingPage(), /<img [^>]*>/gu)
    const [hero, ...belowTheHero] = images

    expect(hero).toContain("marketing/hero.webp")
    expect(belowTheHero.length).toBeGreaterThan(catalog.newArrivals.length + catalog.categories.length)
    for (const image of belowTheHero) {
      expect(image).toContain('loading="lazy"')
      expect(image).toContain('decoding="async"')
      expect(image).not.toContain("fetchPriority")
    }
  })

  it("ships the ambience video without autoplay, downloading it with the page", () => {
    const [video] = tagsNamed(renderLandingPage(), /<video [^>]*>/gu)

    expect(video).toContain('preload="auto"')
    expect(video).not.toContain("autoPlay")
    expect(video).not.toContain("poster")
  })
})

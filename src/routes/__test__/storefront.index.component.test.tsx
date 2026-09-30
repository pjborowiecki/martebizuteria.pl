import { type JSX, type RefObject } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

interface LandingLoaderContext {
  readonly imagePrefetchService: { readonly preload: () => void }
  readonly locale: string
  readonly queryClient: { readonly query: (options: { readonly queryKey: readonly string[] }) => Promise<unknown> }
}

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (args: { readonly context: LandingLoaderContext }) => Promise<PageMeta>
  readonly staticData?: unknown
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

const spies = vi.hoisted(() => ({
  categoriesQuery: vi.fn(() => ({ queryKey: ["categories"] })),
  landingAnimations: vi.fn<(options: { rootRef: RefObject<HTMLDivElement | null> }) => void>(),
  messagesQueryOptions: vi.fn((input: { locale: string; namespace: string }) => ({ queryKey: ["messages", input.namespace] })),
  newArrivalsQuery: vi.fn(() => ({ queryKey: ["new-arrivals"] })),
  prefetchProductThumbnails: vi.fn<(products: readonly { thumbnail: string }[], service: unknown) => void>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

vi.mock("~/src/hooks/use-landing-animations", () => ({ useLandingAnimations: spies.landingAnimations }))
vi.mock("~/src/integrations/use-intl/i18n.messages", async (importOriginal) => ({
  ...(await importOriginal<typeof I18nMessages>()),
  messagesQueryOptions: spies.messagesQueryOptions,
}))
vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({ getNewArrivalsQuery: spies.newArrivalsQuery }))
vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({ getCategoriesQuery: spies.categoriesQuery }))
vi.mock("~/src/lib/image", () => ({ prefetchProductThumbnails: spies.prefetchProductThumbnails }))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/hero-section", () => ({
  HeroSection: (): JSX.Element => <section>hero</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/video-experience-section", () => ({
  VideoExperienceSection: (): JSX.Element => <section>video</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/values-section", () => ({
  ValuesSection: (): JSX.Element => <section>values</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/manifesto-section", () => ({
  ManifestoSection: (): JSX.Element => <section>manifesto</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-section", () => ({
  NewArrivalsSection: (): JSX.Element => <section>new arrivals</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/mobile-categories-section", () => ({
  MobileCategoriesSection: (): JSX.Element => <section>mobile categories</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/desktop-categories-section", () => ({
  DesktopCategoriesSection: (): JSX.Element => <section>desktop categories</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/archive-section", () => ({
  ArchiveSection: (): JSX.Element => <section>archive</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/breaker-section", () => ({
  BreakerSection: (): JSX.Element => <section>breaker</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/shop-categories-section", () => ({
  ShopCategoriesSection: (): JSX.Element => <section>shop categories</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/philosophy-section", () => ({
  PhilosophySection: (): JSX.Element => <section>philosophy</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/silver-premium-section", () => ({
  SilverPremiumSection: (): JSX.Element => <section>silver premium</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/maison-heritage-section", () => ({
  MaisonHeritageSection: (): JSX.Element => <section>maison heritage</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/shop-collections-section", () => ({
  ShopCollectionsSection: (): JSX.Element => <section>shop collections</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/sections/newsletter-section", () => ({
  NewsletterSection: (): JSX.Element => <section>newsletter</section>,
}))

import { type PageMeta, pageHead } from "~/src/lib/seo"

await import("~/src/routes/_storefront.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the landing route did not register any options")
}

const HomePage = (): JSX.Element => {
  const Page = route.component
  if (Page === undefined) {
    throw new Error("the landing route renders no component")
  }

  return <Page />
}

const LANDING_MESSAGES = {
  meta: {
    description: "Handcrafted silver and women's jewelry by M'Arte — Polish atelier, pure forms, and 925 silver.",
    title: "M'Arte | Handcrafted Jewelry",
  },
}

const NEW_ARRIVALS = [{ thumbnail: "products/aurora.webp" }]

const query = (options: { readonly queryKey: readonly string[] }): Promise<unknown> =>
  Promise.resolve(options.queryKey[0] === "messages" ? LANDING_MESSAGES : NEW_ARRIVALS)

const runLoader = (): Promise<PageMeta> | undefined =>
  route.loader?.({ context: { imagePrefetchService: { preload: () => {} }, locale: "en-US", queryClient: { query } } })

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("landing page", () => {
  it("wraps the whole page in the main landmark", () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByRole("main")).toHaveAttribute("data-landing-page")
  })

  it("lays the editorial sections out in reading order", () => {
    renderWithProviders(<HomePage />)

    expect([...screen.getByRole("main").children].map((child) => child.textContent)).toStrictEqual([
      "hero",
      "video",
      "values",
      "manifesto",
      "new arrivals",
      "mobile categories",
      "desktop categories",
      "archive",
      "breaker",
      "shop categories",
      "philosophy",
      "silver premium",
      "maison heritage",
      "shop collections",
      "newsletter",
    ])
  })

  it("hands the scroll animations the element that holds every section", () => {
    renderWithProviders(<HomePage />)
    const [call] = spies.landingAnimations.mock.calls

    expect(call?.[0].rootRef.current).toBe(screen.getByRole("main"))
  })
})

describe("landing route loader", () => {
  it("titles the page from the landing message catalogue", async () => {
    await expect(runLoader()).resolves.toStrictEqual({
      description: "Handcrafted silver and women's jewelry by M'Arte — Polish atelier, pure forms, and 925 silver.",
      title: "M'Arte | Handcrafted Jewelry",
    })
  })

  it("loads the landing namespace for the active locale", async () => {
    await runLoader()

    expect(spies.messagesQueryOptions).toHaveBeenCalledWith({ locale: "en-US", namespace: "pages.landing" })
  })

  it("prefetches the new arrivals and the categories the page shows", async () => {
    await runLoader()

    expect(spies.newArrivalsQuery).toHaveBeenCalled()
    expect(spies.categoriesQuery).toHaveBeenCalled()
  })

  it("warms the thumbnails of the new arrivals it just loaded", async () => {
    await runLoader()

    expect(spies.prefetchProductThumbnails.mock.calls[0]?.[0]).toBe(NEW_ARRIVALS)
  })
})

describe("landing route wiring", () => {
  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })

  it("preloads the landing and category namespaces", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.landing", "pages.categories"] })
  })
})

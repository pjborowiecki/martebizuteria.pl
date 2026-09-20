import { type JSX, useRef } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { categoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-categories"
import { landingNewArrivalsQueryOptions } from "~/src/modules/product/use-cases/get-new-arrivals"

import { useLandingAnimations } from "~/src/hooks/use-landing-animations"

import { prefetchProductThumbnails } from "~/src/lib/image"

import { APP_NAME } from "~/src/presentation/branding/app"

import { ArchiveSection } from "~/src/presentation/components/custom/pages/landing-page/sections/archive-section"
import { BreakerSection } from "~/src/presentation/components/custom/pages/landing-page/sections/breaker-section"
import { DesktopCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/desktop-categories-section"
import { HeroSection } from "~/src/presentation/components/custom/pages/landing-page/sections/hero-section"
import { MaisonHeritageSection } from "~/src/presentation/components/custom/pages/landing-page/sections/maison-heritage-section"
import { ManifestoSection } from "~/src/presentation/components/custom/pages/landing-page/sections/manifesto-section"
import { MobileCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/mobile-categories-section"
import { NewArrivalsSection } from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-section"
import { NewsletterSection } from "~/src/presentation/components/custom/pages/landing-page/sections/newsletter-section"
import { PhilosophySection } from "~/src/presentation/components/custom/pages/landing-page/sections/philosophy-section"
import { ShopCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/shop-categories-section"
import { ShopCollectionsSection } from "~/src/presentation/components/custom/pages/landing-page/sections/shop-collections-section"
import { SilverPremiumSection } from "~/src/presentation/components/custom/pages/landing-page/sections/silver-premium-section"
import { ValuesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/values-section"
import { VideoExperienceSection } from "~/src/presentation/components/custom/pages/landing-page/sections/video-experience-section"
const HomePage = (): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations({
    rootRef,
  })
  return (
    <main ref={rootRef} className="bg-background text-foreground" data-landing-page>
      <HeroSection />
      <VideoExperienceSection />
      <ValuesSection />
      <ManifestoSection />
      <NewArrivalsSection />
      <MobileCategoriesSection />
      <DesktopCategoriesSection />
      <ArchiveSection />
      <BreakerSection />
      <ShopCategoriesSection />
      <PhilosophySection />
      <SilverPremiumSection />
      <MaisonHeritageSection />
      <ShopCollectionsSection />
      <NewsletterSection />
    </main>
  )
}
interface HomePageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/_storefront/")({
  component: HomePage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<HomePageMeta> | undefined
  }>) => ({
    meta: [
      {
        title: loaderData?.title ?? APP_NAME,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
      {
        content: loaderData?.title ?? APP_NAME,
        property: "og:title",
      },
      {
        content: loaderData?.description ?? "",
        property: "og:description",
      },
    ],
  }),
  loader: async ({ context }) => {
    const { locale } = context
    const [messages, newArrivals] = await Promise.all([
      context.queryClient.query(messagesQueryOptions(locale, "pages.landing")),
      context.queryClient.query({
        ...landingNewArrivalsQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...categoriesQueryOptions(),
        staleTime: "static",
      }),
    ])
    prefetchProductThumbnails(newArrivals, context.imagePrefetchService)
    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies HomePageMeta
  },
  staticData: {
    namespaces: ["pages.landing", "pages.categories"],
  },
})

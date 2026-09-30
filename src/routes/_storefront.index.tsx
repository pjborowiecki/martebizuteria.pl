import { type JSX, useRef } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { getCategoriesQuery } from "~/src/modules/product-category/use-cases/get-categories"
import { getNewArrivalsQuery } from "~/src/modules/product/use-cases/get-new-arrivals"

import { useLandingAnimations } from "~/src/hooks/use-landing-animations"

import { prefetchProductThumbnails } from "~/src/lib/image"
import { type PageMeta, pageHead } from "~/src/lib/seo"

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

import type landingMessages from "~/messages/en-US/pages.landing.json"

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

export const Route = createFileRoute("/_storefront/")({
  component: HomePage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const [messages, newArrivals] = await Promise.all([
      context.queryClient.query(messagesQueryOptions<typeof landingMessages>({ locale, namespace: "pages.landing" })),
      context.queryClient.query({
        ...getNewArrivalsQuery(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...getCategoriesQuery(),
        staleTime: "static",
      }),
    ])
    prefetchProductThumbnails(newArrivals, context.imagePrefetchService)

    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.landing", "pages.categories"],
  },
})

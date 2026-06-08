import { type JSX, useRef } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { prefetchProductThumbnails } from "~/src/lib/_utils/image";
import { isValidLocale } from "~/src/lib/utils";

import { ArchiveSection } from "~/src/components/custom/pages/landing-page/sections/archive-section";
import { BreakerSection } from "~/src/components/custom/pages/landing-page/sections/breaker-section";
import { DesktopCategoriesSection } from "~/src/components/custom/pages/landing-page/sections/desktop-categories-section";
import { HeroSection } from "~/src/components/custom/pages/landing-page/sections/hero-section";
import { MaisonHeritageSection } from "~/src/components/custom/pages/landing-page/sections/maison-heritage-section";
import { ManifestoSection } from "~/src/components/custom/pages/landing-page/sections/manifesto-section";
import { MobileCategoriesSection } from "~/src/components/custom/pages/landing-page/sections/mobile-categories-section";
import { NewArrivalsSection } from "~/src/components/custom/pages/landing-page/sections/new-arrivals-section";
import { NewsletterSection } from "~/src/components/custom/pages/landing-page/sections/newsletter-section";
import { PhilosophySection } from "~/src/components/custom/pages/landing-page/sections/philosophy-section";
import { ShopCategoriesSection } from "~/src/components/custom/pages/landing-page/sections/shop-categories-section";
import { ShopCollectionsSection } from "~/src/components/custom/pages/landing-page/sections/shop-collections-section";
import { SilverPremiumSection } from "~/src/components/custom/pages/landing-page/sections/silver-premium-section";
import { ValuesSection } from "~/src/components/custom/pages/landing-page/sections/values-section";
import { VideoExperienceSection } from "~/src/components/custom/pages/landing-page/sections/video-experience-section";

import { useLandingAnimations } from "~/src/hooks/use-landing-animations";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";
import { productQueryOptions } from "~/src/modules/product/product.queries";

interface HomePageMeta {
  readonly description: string;
  readonly title: string;
}

function getLandingMeta(messages: Messages | undefined): HomePageMeta {
  const title = messages?.pages.landing.meta.title ?? CONSTANTS.APP_NAME;
  const description = messages?.pages.landing.meta.description ?? "";

  return { description, title };
}

export const Route = createFileRoute("/{-$locale}/_storefront/")({
  component: HomePage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<HomePageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: async ({ context, params }) => {
    const { locale: rawLocale } = params;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    const [messages, newArrivals] = await Promise.all([
      Promise.resolve(context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey)),
      context.queryClient.ensureQueryData(productQueryOptions.landingNewArrivalsQueryOptions()),
      context.queryClient.ensureQueryData(categoryQueryOptions.categoriesQueryOptions())
    ]);

    prefetchProductThumbnails(newArrivals, context.imagePrefetchService);

    return getLandingMeta(messages);
  }
});

function HomePage(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useLandingAnimations({
    rootRef
  });

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
  );
}

import { type JSX, useRef } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";
import { getAssetURL } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";
import { buttonVariants } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";
import { ProductCard } from "~/src/components/custom/landing/product-card";
import { LocalizedLink } from "~/src/components/custom/localized-link";

const HERO_IMG = getAssetURL("marketing/hero.webp");
const VIDEO_POSTER = getAssetURL("placeholder.svg");
const VIDEO_SRC = getAssetURL("marketing/landing-video.mp4");

const PRODUCTS = [
  {
    detailsKey: "newArrivals.items.lapis.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.lapis.name",
    priceKey: "newArrivals.items.lapis.price"
  },
  {
    detailsKey: "newArrivals.items.aurelia.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.aurelia.name",
    priceKey: "newArrivals.items.aurelia.price"
  },
  {
    detailsKey: "newArrivals.items.azure.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.azure.name",
    priceKey: "newArrivals.items.azure.price"
  },
  {
    detailsKey: "newArrivals.items.heritage.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.heritage.name",
    priceKey: "newArrivals.items.heritage.price"
  },
  {
    detailsKey: "newArrivals.items.pearl.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.pearl.name",
    priceKey: "newArrivals.items.pearl.price"
  },
  {
    detailsKey: "newArrivals.items.midnight.details",
    image: getAssetURL("placeholder.svg"),
    nameKey: "newArrivals.items.midnight.name",
    priceKey: "newArrivals.items.midnight.price"
  }
] as const;

/** Panel art — use stable Unsplash IDs; avoid parallax-wrap here (GSAP + next/image fill can fail in horizontal pin) */
const CATEGORY_PANELS = [
  {
    descriptionKey: "categories.panels.aurora.description",
    image: getAssetURL("placeholder.svg"),
    titleKey: "categories.panels.aurora.title"
  },
  {
    descriptionKey: "categories.panels.stone.description",
    image: getAssetURL("placeholder.svg"),
    titleKey: "categories.panels.stone.title"
  },
  {
    descriptionKey: "categories.panels.nightfall.description",
    image: getAssetURL("placeholder.svg"),
    titleKey: "categories.panels.nightfall.title"
  }
] as const;

const ARCHIVE_ARTICLES = [
  { href: "/collections" as const, titleKey: "archive.articles.golden" },
  { href: "/collections" as const, titleKey: "archive.articles.sustainability" },
  { href: "/collections" as const, titleKey: "archive.articles.engraving" }
] as const;

const SHOP_CATEGORIES = [
  {
    countKey: "shopCategories.items.earrings.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.earrings.name",
    slug: "kolczyki"
  },
  {
    countKey: "shopCategories.items.necklaces.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.necklaces.name",
    slug: "naszyjniki"
  },
  {
    countKey: "shopCategories.items.bracelets.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.bracelets.name",
    slug: "bransoletki"
  },
  {
    countKey: "shopCategories.items.rings.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.rings.name",
    slug: "pierscionki"
  },
  {
    countKey: "shopCategories.items.chokers.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.chokers.name",
    slug: "kolczyki"
  },
  {
    countKey: "shopCategories.items.pendants.count",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCategories.items.pendants.name",
    slug: "naszyjniki"
  }
] as const;

const SHOP_COLLECTIONS = [
  {
    descKey: "shopCollections.items.newArrivals.description",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCollections.items.newArrivals.name",
    slug: "nowosci"
  },
  {
    descKey: "shopCollections.items.bestsellers.description",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCollections.items.bestsellers.name",
    slug: "bestsellery"
  },
  {
    descKey: "shopCollections.items.gifts.description",
    image: getAssetURL("placeholder.svg"),
    nameKey: "shopCollections.items.gifts.name",
    slug: "prezenty"
  }
] as const;

const GALLERY_IMAGES = [
  {
    altKey: "gallery.items.ritual",
    image: getAssetURL("placeholder.svg")
  },
  {
    altKey: "gallery.items.stone",
    image: getAssetURL("placeholder.svg")
  },
  {
    altKey: "gallery.items.signature",
    image: getAssetURL("placeholder.svg")
  }
] as const;

export function LandingPageExperience(): JSX.Element {
  const t = useTranslations("landingPage");
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.batch(".reveal", {
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power2.out",
              stagger: 0.08,
              overwrite: true
            });
          },
          once: true,
          start: "top 88%"
        });

        gsap.set(".reveal", { autoAlpha: 0, y: 28 });

        gsap.utils.toArray<HTMLElement>(".parallax-wrap").forEach((wrap) => {
          const img = wrap.querySelector(".parallax-img");
          if (!img) {
            return;
          }

          gsap.fromTo(
            img,
            { yPercent: -6 },
            {
              ease: "none",
              scrollTrigger: { end: "bottom top", scrub: true, start: "top bottom", trigger: wrap },
              yPercent: 6
            }
          );
        });

        gsap.utils.toArray<HTMLElement>(".line-reveal").forEach((line) => {
          gsap.fromTo(
            line,
            { scaleX: 0, transformOrigin: "left center" },
            {
              duration: 1,
              ease: "power2.out",
              scaleX: 1,
              scrollTrigger: { once: true, start: "top 92%", trigger: line }
            }
          );
        });

        const videoSection = root.current?.querySelector<HTMLElement>(".video-section");
        const valuesSection = root.current?.querySelector<HTMLElement>(".values-section");

        if (videoSection && valuesSection) {
          gsap.to(videoSection, {
            ease: "none",
            scrollTrigger: {
              end: "bottom top",
              scrub: true,
              start: "top top",
              trigger: videoSection
            },
            yPercent: 25
          });

          gsap.from(valuesSection, {
            ease: "none",
            scrollTrigger: {
              end: "top 60%",
              scrub: true,
              start: "top bottom",
              trigger: valuesSection
            },
            yPercent: -15
          });
        }
      });

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const section = root.current?.querySelector<HTMLElement>(".horizontal-section");
        const track = root.current?.querySelector<HTMLElement>(".horizontal-track");
        if (!section || !track) {
          return;
        }

        gsap.to(track, {
          ease: "none",
          scrollTrigger: {
            anticipatePin: 1,
            end: () => `+=${track.scrollWidth - section.clientWidth}`,
            invalidateOnRefresh: true,
            pin: true,
            scrub: true,
            start: "top top",
            trigger: section
          },
          x: () => -(track.scrollWidth - section.clientWidth)
        });
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className="bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-400 px-6 pt-10 pb-16 lg:px-12 lg:pt-14 lg:pb-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="flex flex-col justify-end gap-8">
            <div className="space-y-8">
              <Badge className="reveal rounded-none px-0 font-medium tracking-[0.28em] uppercase" variant="outline">
                {t("hero.eyebrow")}
              </Badge>

              <div className="reveal space-y-5">
                <h1 className="font-serif text-5xl leading-[0.94] tracking-tight md:text-6xl lg:text-7xl">
                  {t("hero.titleLine1")}
                  <br />
                  <span className="italic">{t("hero.titleLine2")}</span>
                </h1>
                <p className="max-w-lg text-sm/relaxed font-light text-muted-foreground md:text-base/relaxed">{t("hero.description")}</p>
              </div>

              <div className="reveal flex flex-wrap items-center gap-4">
                <LocalizedLink
                  to="/products"
                  className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("hero.ctaPrimary")}
                </LocalizedLink>
                <LocalizedLink
                  to="/collections"
                  className="inline-flex h-13 items-center justify-center px-10 text-sm font-medium tracking-wide transition-colors hover:text-foreground/70"
                >
                  {t("hero.ctaSecondary")}
                </LocalizedLink>
              </div>

              <div className="reveal pt-3">
                <Separator className="line-reveal max-w-52 bg-foreground/35" />
                <p className="pt-3 text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("hero.scrollHint")}</p>
              </div>
            </div>
          </div>

          <div className="parallax-wrap reveal relative aspect-[5/6] overflow-hidden bg-card">
            <Image
              alt={t("hero.imageAlt")}
              className="parallax-img absolute inset-0 size-full object-cover"
              height={2160}
              priority
              sizes="(max-width: 1024px) 100vw, 56vw"
              src={HERO_IMG}
              width={1800}
            />
          </div>
        </div>
      </section>

      {/* ── Video experience ── */}
      <section id="experience" className="video-section relative z-0 flex min-h-svh items-end overflow-hidden bg-primary text-white">
        {/* Video layer */}
        <div className="absolute inset-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={VIDEO_POSTER}
            src={VIDEO_SRC}
          />
        </div>

        {/* Multi-layered overlay — readability + depth */}
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/35 via-transparent to-black/15" />
        {/* Extra bottom band so type never sits on bare video */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(58%,520px)] bg-linear-to-t from-black/55 via-black/20 to-transparent" />

        {/* Content — generous inset from edges; headline two lines with indent on line 2 */}
        <div className="relative z-10 flex w-full max-w-400 flex-col gap-12 px-6 pt-44 pb-40 sm:gap-14 sm:pt-52 sm:pb-44 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-12 lg:pt-64 lg:pb-52 xl:pb-56">
          <div className="max-w-4xl space-y-5 sm:space-y-6 lg:space-y-7">
            <p className="reveal text-[11px] tracking-[0.28em] text-white/85 uppercase drop-shadow-[0_1px_12px_rgba(0,0,0,0.55)]">
              {t("experience.eyebrow")}
            </p>
            <h2 className="reveal font-serif leading-[0.92] text-white [text-shadow:0_4px_48px_rgba(0,0,0,0.55)]">
              <span className="block text-6xl md:text-8xl lg:text-8xl xl:text-9xl">{t("experience.titleLine1")}</span>
              <span className="mt-2 block pl-4 text-6xl italic md:mt-3 md:pl-6 md:text-8xl lg:mt-4 lg:pl-10 lg:text-8xl xl:pl-12 xl:text-9xl">
                {t("experience.titleLine2")}
              </span>
            </h2>
            <p className="reveal max-w-xl text-base/relaxed text-white/85 [text-shadow:0_1px_24px_rgba(0,0,0,0.45)] md:text-lg/relaxed lg:text-xl/relaxed">
              {t("experience.description")}
            </p>
          </div>

          <div className="reveal flex shrink-0 flex-wrap items-center justify-end gap-3 self-end pb-[env(safe-area-inset-bottom)] sm:gap-4 lg:self-auto lg:pb-0">
            <LocalizedLink
              to="/account"
              className="inline-flex h-12 min-w-[11rem] items-center justify-center rounded-none bg-white px-8 text-sm font-medium tracking-wide text-black transition-colors hover:bg-white/90"
            >
              {t("experience.ctaPrimary")}
            </LocalizedLink>
            <LocalizedLink
              to="/collections"
              className="inline-flex h-12 min-w-[11rem] items-center justify-center rounded-none border border-white/50 bg-white/5 px-8 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/15"
            >
              {t("experience.ctaSecondary")}
            </LocalizedLink>
          </div>
        </div>

        {/* Hairline at bottom — sits above safe padding */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-white/15" />
      </section>

      {/* ── Values ── */}
      <section className="values-section relative z-10 bg-background py-20 lg:py-32">
        <div className="mx-auto max-w-400 px-6 lg:px-12">
          <div className="reveal mb-12 max-w-xl space-y-3">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("values.eyebrow")}</p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("values.title")}</h2>
          </div>

          <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-6 lg:gap-x-10">
            <div className="reveal md:col-span-5 md:row-span-2">
              <div className="parallax-wrap relative aspect-[3/4] overflow-hidden bg-secondary">
                <Image
                  alt={t("values.craft.title")}
                  className="parallax-img absolute inset-0 size-full object-cover"
                  height={1000}
                  sizes="(max-width: 768px) 100vw, 40vw"
                  src={getAssetURL("marketing/archive-editorial.webp")}
                  width={800}
                />
              </div>
            </div>

            <div className="reveal flex flex-col justify-end space-y-3 md:col-span-7">
              <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
              <h3 className="font-serif text-2xl">{t("values.craft.title")}</h3>
              <p className="max-w-md text-sm/relaxed text-muted-foreground">{t("values.craft.description")}</p>
            </div>

            <div className="reveal flex flex-col justify-start space-y-3 md:col-span-3">
              <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
              <h3 className="font-serif text-2xl">{t("values.material.title")}</h3>
              <p className="text-sm/relaxed text-muted-foreground">{t("values.material.description")}</p>
            </div>

            <div className="reveal flex flex-col justify-start space-y-3 md:col-span-4">
              <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
              <h3 className="font-serif text-2xl">{t("values.service.title")}</h3>
              <p className="text-sm/relaxed text-muted-foreground">{t("values.service.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Manifesto ── */}
      <section className="bg-secondary/40 py-24 lg:py-36">
        <div className="reveal mx-auto max-w-3xl space-y-8 px-6 text-center lg:px-12">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("manifesto.eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">
            {t("manifesto.title")}
            <br />
            <span className="italic">{t("manifesto.subtitle")}</span>
          </h2>
          <Separator className="line-reveal mx-auto max-w-16 bg-foreground/30" />
          <div className="mx-auto max-w-2xl space-y-6">
            <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("manifesto.paragraph1")}</p>
            <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("manifesto.paragraph2")}</p>
            <p className="text-base/relaxed text-foreground md:text-lg/relaxed">{t("manifesto.paragraph3")}</p>
          </div>
          <p className="pt-4 font-serif text-lg text-foreground/80 italic">{t("manifesto.closing")}</p>
        </div>
      </section>

      {/* ── Products ── */}
      <section id="nowosci" className="mx-auto max-w-400 space-y-10 px-6 pt-20 pb-20 lg:px-12 lg:pt-28 lg:pb-28">
        <div className="reveal flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("newArrivals.eyebrow")}</p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("newArrivals.title")}</h2>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("newArrivals.description")}</p>
          </div>
          <LocalizedLink
            to="/products"
            className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("newArrivals.cta")}
          </LocalizedLink>
        </div>

        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {PRODUCTS.map((item) => (
            <ProductCard
              key={item.nameKey}
              href="/products"
              image={item.image}
              name={t(item.nameKey)}
              detail={t(item.detailsKey)}
              price={t(item.priceKey)}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
              parallax
              className="reveal"
            />
          ))}
        </div>
      </section>

      {/* ── Horizontal categories (mobile stacked) ── */}
      <section className="mx-auto max-w-400 space-y-8 px-6 pb-8 lg:hidden lg:px-12">
        <div className="reveal">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("categories.eyebrow")}</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{t("categories.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">{t("categories.description")}</p>
        </div>

        <div className="space-y-6">
          {CATEGORY_PANELS.map((panel, index) => (
            <article key={panel.titleKey} className="reveal overflow-hidden border border-border/60 bg-background">
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-muted">
                <Image
                  alt={t(panel.titleKey)}
                  className="absolute inset-0 size-full object-cover"
                  height={1000}
                  priority={index === 0}
                  sizes="100vw"
                  src={panel.image}
                  width={1250}
                />
              </div>
              <div className="space-y-3 px-1 py-5 sm:px-2 sm:py-6">
                <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{t("categories.panelEyebrow")}</p>
                <h3 className="font-serif text-3xl leading-[1.05] tracking-tight sm:text-4xl">{t(panel.titleKey)}</h3>
                <p className="max-w-prose text-sm/relaxed text-foreground/85 sm:text-base/relaxed">{t(panel.descriptionKey)}</p>
                <LocalizedLink
                  to="/collections"
                  className="inline-flex pt-1 text-[11px] tracking-[0.18em] text-foreground uppercase underline-offset-4 transition-colors hover:text-muted-foreground"
                >
                  {t("categories.cta")}
                </LocalizedLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Horizontal categories (desktop pinned) ── */}
      <section id="kolekcje" className="horizontal-section relative hidden overflow-hidden bg-background lg:block">
        <div className="horizontal-track flex w-max">
          {/* Title panel */}
          <article className="flex h-screen w-screen items-center px-12">
            <div className="mx-auto max-w-400 space-y-4">
              <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("categories.eyebrow")}</p>
              <h2 className="font-serif text-5xl leading-tight md:text-6xl lg:text-7xl">{t("categories.title")}</h2>
              <p className="max-w-xl text-base/relaxed text-muted-foreground">{t("categories.description")}</p>
            </div>
          </article>

          {CATEGORY_PANELS.map((panel, index) => (
            <article key={panel.titleKey} className="flex h-screen w-screen items-center px-8 sm:px-12">
              <div className="mx-auto grid w-full max-w-400 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14">
                <div className="order-2 space-y-5 self-center lg:order-1 lg:space-y-6">
                  <p className="text-[11px] tracking-[0.26em] text-foreground/55 uppercase">{t("categories.panelEyebrow")}</p>
                  <h3 className="font-serif text-5xl leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">{t(panel.titleKey)}</h3>
                  <p className="max-w-md text-lg/relaxed text-foreground/80 md:text-xl/relaxed">{t(panel.descriptionKey)}</p>
                  <LocalizedLink
                    to="/collections"
                    className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t("categories.cta")}
                  </LocalizedLink>
                </div>
                <div className="relative order-1 aspect-[4/5] w-full overflow-hidden bg-muted lg:order-2 lg:aspect-[5/6]">
                  <Image
                    alt={t(panel.titleKey)}
                    className="absolute inset-0 size-full object-cover"
                    height={1200}
                    priority={index === 0}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    src={panel.image}
                    width={1000}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Archive / editorial ── */}
      <section className="mx-auto max-w-400 px-6 py-16 lg:px-12 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-12">
          <div className="parallax-wrap reveal relative aspect-[4/5] overflow-hidden bg-card">
            <Image
              alt={t("archive.imageAlt")}
              className="parallax-img absolute inset-0 size-full object-cover"
              height={1600}
              sizes="(max-width: 1024px) 100vw, 45vw"
              src={getAssetURL("marketing/archive-editorial.webp")}
              width={1280}
            />
          </div>
          <div className="reveal space-y-5">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("archive.eyebrow")}</p>
            <h2 className="font-serif text-5xl leading-[0.98]">{t("archive.title")}</h2>
            <ul className="divide-y divide-border border-y border-border">
              {ARCHIVE_ARTICLES.map((a) => (
                <li key={a.titleKey}>
                  <LocalizedLink
                    to={a.href}
                    className="group flex items-center justify-between py-5 text-lg transition-colors hover:text-muted-foreground"
                  >
                    <span>{t(a.titleKey)}</span>
                    <ArrowRight className="transition-transform duration-500 group-hover:translate-x-1" />
                  </LocalizedLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Breaker ── */}
      <section className="mx-auto max-w-400 px-6 pb-16 lg:px-12 lg:pb-24">
        <div className="reveal bg-secondary px-8 py-16 text-center">
          <p className="font-serif text-4xl leading-tight md:text-5xl">{t("breaker.text")}</p>
        </div>
      </section>

      {/* ── Shop by category — Fibonacci grid (8:5 / 5:8 / 3:5:5) ── */}
      <section className="mx-auto max-w-400 px-6 pb-24 lg:px-12 lg:pb-36">
        <div className="reveal mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-18">
          <div className="space-y-4">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("shopCategories.eyebrow")}</p>
            <h2 className="font-serif text-5xl leading-[0.94] tracking-tight md:text-6xl lg:text-7xl">{t("shopCategories.title")}</h2>
          </div>
          <LocalizedLink
            to="/categories"
            className="inline-flex h-12 shrink-0 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50 sm:self-end"
          >
            {t("shopCategories.cta")}
          </LocalizedLink>
        </div>

        {/* Row 1 — golden ratio 8 : 5 */}
        <div className="reveal grid gap-5 lg:grid-cols-[8fr_5fr] lg:gap-6">
          <LocalizedLink className="group block" params={{ handle: SHOP_CATEGORIES[0].slug }} to="/categories/$handle">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 lg:aspect-[8/5]">
              <Image
                alt={t(SHOP_CATEGORIES[0].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 100vw, 62vw"
                src={SHOP_CATEGORIES[0].image}
                width={1000}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[0].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[0].countKey)}</span>
            </div>
          </LocalizedLink>
          <LocalizedLink className="group block" params={{ handle: SHOP_CATEGORIES[1].slug }} to="/categories/$handle">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 lg:aspect-[8/5]">
              <Image
                alt={t(SHOP_CATEGORIES[1].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 100vw, 38vw"
                src={SHOP_CATEGORIES[1].image}
                width={1000}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[1].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[1].countKey)}</span>
            </div>
          </LocalizedLink>
        </div>

        {/* Row 2 — reversed golden ratio 5 : 8 */}
        <div className="reveal mt-10 grid grid-cols-2 gap-5 lg:mt-14 lg:grid-cols-[5fr_8fr] lg:gap-6">
          <LocalizedLink className="group block" params={{ handle: SHOP_CATEGORIES[2].slug }} to="/categories/$handle">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 lg:aspect-[5/3]">
              <Image
                alt={t(SHOP_CATEGORIES[2].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 50vw, 38vw"
                src={SHOP_CATEGORIES[2].image}
                width={1000}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[2].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[2].countKey)}</span>
            </div>
          </LocalizedLink>
          <LocalizedLink className="group block" params={{ handle: SHOP_CATEGORIES[3].slug }} to="/categories/$handle">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 lg:aspect-[5/3]">
              <Image
                alt={t(SHOP_CATEGORIES[3].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 50vw, 62vw"
                src={SHOP_CATEGORIES[3].image}
                width={1000}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[3].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[3].countKey)}</span>
            </div>
          </LocalizedLink>
        </div>

        {/* Row 3 — Fibonacci trio 3 : 5 : 5 */}
        <div className="reveal mt-10 grid grid-cols-2 gap-5 lg:mt-14 lg:grid-cols-[3fr_5fr_5fr] lg:gap-6">
          <LocalizedLink className="group block" params={{ handle: SHOP_CATEGORIES[4].slug }} to="/categories/$handle">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 lg:aspect-[5/8]">
              <Image
                alt={t(SHOP_CATEGORIES[4].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 50vw, 23vw"
                src={SHOP_CATEGORIES[4].image}
                width={640}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[4].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[4].countKey)}</span>
            </div>
          </LocalizedLink>
          <LocalizedLink
            className="group col-span-2 block sm:col-span-1"
            params={{ handle: SHOP_CATEGORIES[5].slug }}
            to="/categories/$handle"
          >
            <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100 sm:aspect-[4/5] lg:aspect-[5/8]">
              <Image
                alt={t(SHOP_CATEGORIES[5].nameKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={800}
                sizes="(max-width: 1024px) 100vw, 38vw"
                src={SHOP_CATEGORIES[5].image}
                width={1000}
              />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(SHOP_CATEGORIES[5].nameKey)}</h3>
              <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(SHOP_CATEGORIES[5].countKey)}</span>
            </div>
          </LocalizedLink>
          <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
            <div className="space-y-5 py-8 lg:py-0">
              <Separator className="line-reveal max-w-16 bg-foreground/20" />
              <p className="max-w-xs text-sm/relaxed text-foreground/45">{t("shopCategories.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="mx-auto max-w-400 px-6 pb-20 lg:px-12 lg:pb-28">
        <div className="reveal mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("philosophy.eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("philosophy.title")}</h2>
          <Separator className="line-reveal mx-auto max-w-16 bg-foreground/30" />
          <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("philosophy.paragraph1")}</p>
          <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("philosophy.paragraph2")}</p>
          <p className="pt-2 text-[11px] tracking-[0.2em] text-muted-foreground/70 uppercase">{t("philosophy.signature")}</p>
        </div>
      </section>

      {/* ── Silver 925 — premium showcase ── */}
      <section id="srebro" className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-400 gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12 lg:py-32">
          {/* Left — copy */}
          <div className="reveal space-y-10 lg:space-y-12">
            <div className="space-y-6">
              <p className="text-[10px] tracking-[0.28em] text-primary-foreground/40 uppercase">{t("silver.eyebrow")}</p>
              <h2 className="font-serif text-6xl leading-[0.9] tracking-tight md:text-7xl lg:text-8xl">
                {t("silver.titleMain")} <span className="italic">{t("silver.titleAccent")}</span>
              </h2>
              <p className="max-w-md text-base/[1.7] text-primary-foreground/55 lg:text-lg/[1.7]">{t("silver.description")}</p>
            </div>

            <div className="flex items-center gap-4">
              <LocalizedLink
                to="/collections"
                className="inline-flex h-12 items-center justify-center border border-primary-foreground/25 px-8 text-[11px] tracking-[0.2em] text-primary-foreground uppercase transition-colors hover:border-primary-foreground/60 hover:bg-primary-foreground/5"
              >
                {t("silver.ctaPrimary")}
              </LocalizedLink>
              <LocalizedLink
                to="/categories"
                className="inline-flex h-12 items-center justify-center border border-primary-foreground/25 px-8 text-[11px] tracking-[0.2em] text-primary-foreground uppercase transition-colors hover:border-primary-foreground/60 hover:bg-primary-foreground/5"
              >
                {t("silver.ctaSecondary")}
              </LocalizedLink>
            </div>

            <div className="grid grid-cols-3 gap-8 border-t border-primary-foreground/10 pt-8 lg:gap-12 lg:pt-10">
              <div>
                <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("silver.stats.purity.value")}</p>
                <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">{t("silver.stats.purity.label")}</p>
              </div>
              <div>
                <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("silver.stats.handmade.value")}</p>
                <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">
                  {t("silver.stats.handmade.label")}
                </p>
              </div>
              <div>
                <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("silver.stats.warranty.value")}</p>
                <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">
                  {t("silver.stats.warranty.label")}
                </p>
              </div>
            </div>
          </div>

          {/* Right — image with floating badge */}
          <div className="reveal relative">
            <div className="parallax-wrap relative aspect-[4/5] overflow-hidden bg-primary-foreground/5">
              <Image
                alt={t("silver.imageAlt")}
                className="parallax-img absolute inset-0 size-full object-cover"
                height={1400}
                sizes="(max-width: 1024px) 100vw, 50vw"
                src={getAssetURL("marketing/archive-editorial.webp")}
                width={1120}
              />
            </div>
            {/* Floating collection badge */}
            <div className="absolute -bottom-4 left-4 z-10 border border-primary-foreground/15 bg-primary/90 px-5 py-4 backdrop-blur-md sm:left-6 lg:-bottom-5 lg:left-8 lg:px-6 lg:py-5">
              <p className="text-[9px] tracking-[0.22em] text-primary-foreground/45 uppercase">{t("silver.imageBadgeEyebrow")}</p>
              <p className="mt-1 font-serif text-sm text-primary-foreground lg:text-base">{t("silver.imageBadgeTitle")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Maison heritage ── */}
      <section id="marka" className="mx-auto max-w-400 px-6 py-16 lg:px-12 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
          <div className="reveal space-y-5">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("maison.eyebrow")}</p>
            <h2 className="font-serif text-5xl leading-[0.98]">{t("maison.title")}</h2>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("maison.description")}</p>
            <LocalizedLink className={buttonVariants({ variant: "outline" })} to="/collections">
              {t("maison.cta")}
            </LocalizedLink>
          </div>
          <div className="reveal relative mx-auto w-full max-w-2xl">
            <div className="parallax-wrap relative aspect-[16/11] overflow-hidden bg-card">
              <Image
                alt={t("maison.mainImageAlt")}
                className="parallax-img absolute inset-0 size-full object-cover"
                height={1100}
                sizes="(max-width: 1024px) 100vw, 54vw"
                src={getAssetURL("marketing/archive-editorial.webp")}
                width={1600}
              />
            </div>
            <div className="parallax-wrap absolute -bottom-10 -left-8 hidden aspect-square w-54 overflow-hidden border-8 border-background bg-card shadow-sm lg:block">
              <Image
                alt={t("maison.overlayImageAlt")}
                className="parallax-img absolute inset-0 size-full object-cover"
                height={800}
                sizes="240px"
                src={getAssetURL("marketing/archive-editorial.webp")}
                width={800}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Collections ── */}
      <section className="mx-auto max-w-400 space-y-10 px-6 pb-20 lg:px-12 lg:pb-28">
        <div className="reveal flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("shopCollections.eyebrow")}</p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("shopCollections.title")}</h2>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("shopCollections.description")}</p>
          </div>
          <LocalizedLink className={buttonVariants({ variant: "outline" })} to="/collections">
            {t("shopCollections.cta")}
          </LocalizedLink>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {SHOP_COLLECTIONS.map((col) => (
            <LocalizedLink key={col.nameKey} className="reveal group block" params={{ handle: col.slug }} to="/collections/$handle">
              <div className="parallax-wrap relative aspect-[4/5] overflow-hidden bg-secondary">
                <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
                  <Image
                    alt={t(col.nameKey)}
                    className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform group-hover:scale-[1.06]"
                    height={1200}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    src={col.image}
                    width={960}
                  />
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-5">
                  <p className="font-serif text-2xl leading-snug text-white">{t(col.nameKey)}</p>
                  <p className="text-xs/relaxed text-white/75">{t(col.descKey)}</p>
                </div>
              </div>
            </LocalizedLink>
          ))}
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="bg-secondary/40 py-20 lg:py-28">
        <div className="reveal mx-auto max-w-400 px-6 lg:px-12">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("newsletter.title")}</p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">{t("newsletter.title")}</h2>
            <p className="mx-auto max-w-lg text-base/relaxed text-foreground/60 md:text-lg/relaxed">{t("newsletter.description")}</p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl lg:mt-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Input
                placeholder={t("newsletter.placeholder")}
                aria-label={t("newsletter.placeholder")}
                className="h-13 flex-1 rounded-none border-border/60 bg-background px-5 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-foreground/20"
              />
              <button
                type="button"
                className="inline-flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("newsletter.cta")}
                <ArrowRight className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/60">{t("newsletter.note")}</p>
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section className="mx-auto max-w-400 space-y-8 px-6 pb-24 lg:px-12">
        <div className="reveal flex items-center justify-between gap-4">
          <h2 className="font-serif text-4xl md:text-5xl">{t("gallery.title")}</h2>
          <LocalizedLink className={buttonVariants({ variant: "outline" })} to="/collections">
            {t("gallery.cta")}
          </LocalizedLink>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {GALLERY_IMAGES.map((item) => (
            <div key={item.altKey} className="parallax-wrap reveal relative aspect-[4/5] overflow-hidden bg-card">
              <Image
                alt={t(item.altKey)}
                className="parallax-img absolute inset-0 size-full object-cover"
                height={1120}
                sizes="(max-width: 768px) 100vw, 33vw"
                src={item.image}
                width={896}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

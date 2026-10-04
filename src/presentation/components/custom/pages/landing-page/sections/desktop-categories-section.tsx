import { type FocusEvent, type JSX, useMemo, useRef } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { ScrollTrigger, gsap, useGSAP } from "~/src/integrations/gsap/gsap.config"
import { getLenisInstance } from "~/src/integrations/lenis/lenis.instance"

import { getCategoriesQuery } from "~/src/modules/product-category/use-cases/get-categories"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  canRunHorizontalCategoryScroll,
  resolveHorizontalPanelScrollTop,
  resolveHorizontalScrollEnd,
  resolveHorizontalTrackOffset,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-horizontal-scroll"
import {
  type LandingCategoryPanel,
  resolveLandingCategoryPanelCopy,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-panel.utils"

import { ROUTES } from "~/src/routes"

const DesktopCategoryPanel = ({
  category,
  index,
}: Readonly<{
  category: LandingCategoryPanel
  index: number
}>): JSX.Element => {
  const locale = useLocale()
  const t = useTranslations("pages.landing.categoriesSection")
  const panel = resolveLandingCategoryPanelCopy(category, locale)
  const params = useMemo(() => ({ handle: panel.handle }), [panel.handle])

  return (
    <article className="flex h-screen w-screen shrink-0 items-center px-8 sm:px-12">
      <div className="mx-auto grid w-full max-w-400 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14">
        <div className="order-2 space-y-5 self-center lg:order-1 lg:space-y-6">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{panel.tag}</p>
          <h3 className="font-serif text-4xl leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">{panel.title}</h3>
          <p className="max-w-[280px] text-[13px]/relaxed text-muted-foreground">{panel.subtitle}</p>
          <LocalizedLink
            className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            params={params}
            to={ROUTES.CATEGORY}
          >
            {t("discoverCategory", { category: panel.tag })}
          </LocalizedLink>
        </div>
        <AspectRatio className="order-1 w-full overflow-hidden bg-muted lg:order-2 lg:aspect-5/6" ratio={ASPECT_RATIO_PORTRAIT}>
          <Image
            alt={panel.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-105"
            height={1200}
            priority={index === 0}
            sizes="(min-width: 1024px) 45vw, 100vw"
            src={panel.image}
            width={1000}
          />
        </AspectRatio>
      </div>
    </article>
  )
}

export const DesktopCategoriesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.categoriesSection")
  const { data: categories } = useSuspenseQuery(getCategoriesQuery())
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const focusDroppedFromRef = useRef<EventTarget | undefined>(undefined)
  const panelCount = categories.length
  const categoryScrollKey = useMemo(() => categories.map((category) => category.id).join(":"), [categories])
  useGSAP(
    () => {
      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track || panelCount === 0 || !canRunHorizontalCategoryScroll(track)) {
        return
      }
      gsap.matchMedia().add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(track, {
          ease: "none",
          scrollTrigger: {
            end: () => resolveHorizontalScrollEnd(track),
            id: CATEGORY_SCROLL_TRIGGER_ID,
            invalidateOnRefresh: true,
            pin: true,
            scrub: true,
            start: "top top",
            trigger: section,
          },
          x: () => resolveHorizontalTrackOffset(track, section),
        })
      })
    },
    { dependencies: [categoryScrollKey, panelCount], revertOnUpdate: true, scope: sectionRef },
  )
  const rememberWhereFocusDropped = (event: FocusEvent<HTMLElement>) => {
    focusDroppedFromRef.current = event.relatedTarget === null ? event.target : undefined
  }
  const slideFocusedPanelIntoView = (event: FocusEvent<HTMLElement>) => {
    const trigger = ScrollTrigger.getById(CATEGORY_SCROLL_TRIGGER_ID)
    const panel = event.target.closest("article")
    if (
      trigger === undefined ||
      panel === null ||
      trackRef.current === null ||
      event.target === focusDroppedFromRef.current ||
      !event.target.matches(":focus-visible")
    ) {
      return
    }

    const trackOverflow = -resolveHorizontalTrackOffset(trackRef.current, event.currentTarget)
    getLenisInstance()?.scrollTo(resolveHorizontalPanelScrollTop(trigger, panel.offsetLeft, trackOverflow), { immediate: true })
  }

  return (
    <section
      ref={sectionRef}
      id="kolekcje"
      className="horizontal-section relative hidden overflow-clip bg-background lg:block motion-reduce:lg:hidden"
      onBlur={rememberWhereFocusDropped}
      onFocus={slideFocusedPanelIntoView}
    >
      <div ref={trackRef} className="horizontal-track flex w-max will-change-transform">
        <article className="flex h-screen w-screen shrink-0 items-center px-12">
          <div className="mx-auto max-w-400 space-y-4">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
            <h2 className="font-serif text-5xl leading-tight md:text-6xl lg:text-7xl">{t("title")}</h2>
            <p className="max-w-xl text-base/relaxed text-muted-foreground">{t("description")}</p>
          </div>
        </article>

        {categories.map((category, index) => (
          <DesktopCategoryPanel key={category.id} category={category} index={index} />
        ))}
      </div>
    </section>
  )
}

const ASPECT_RATIO_PORTRAIT = 0.8

const CATEGORY_SCROLL_TRIGGER_ID = "landing-categories"

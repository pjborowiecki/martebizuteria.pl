import { type JSX, useRef } from "react";

import { useTranslations } from "use-intl";

import { gsap, useGSAP } from "~/src/lib/gsap";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { LANDING_CATEGORY_PANELS } from "~/src/data/landing-data";

const SCROLL_DURATION_MULTIPLIER = 1.5;
const SCRUB_SPEED = 1;
const SNAP_NUMERATOR = 1;
const ASPECT_RATIO_PORTRAIT = 0.8;
const FIRST_INDEX = 0;

export function DesktopCategoriesSection(): JSX.Element {
  const t = useTranslations("landingPage.categoriesSection");
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;

      if (!section || !track) {
        return;
      }

      gsap.matchMedia().add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(track, {
          ease: "none",
          scrollTrigger: {
            anticipatePin: 1,
            end: () => `+=${(track.scrollWidth - section.clientWidth) * SCROLL_DURATION_MULTIPLIER}`,
            invalidateOnRefresh: true,
            pin: true,
            scrub: SCRUB_SPEED,
            snap: {
              delay: 0,
              directional: true,
              duration: { max: 0.8, min: 0.4 },
              ease: "power2.inOut",
              snapTo: SNAP_NUMERATOR / LANDING_CATEGORY_PANELS.length
            },
            start: "top top",
            trigger: section
          },
          x: () => -(track.scrollWidth - section.clientWidth)
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="kolekcje" className="horizontal-section relative hidden overflow-hidden bg-background lg:block">
      <div ref={trackRef} className="horizontal-track flex w-max will-change-transform">
        <article className="flex h-screen w-screen shrink-0 items-center px-12">
          <div className="mx-auto max-w-400 space-y-4">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
            <h2 className="font-serif text-5xl leading-tight md:text-6xl lg:text-7xl">{t("title")}</h2>
            <p className="max-w-xl text-base/relaxed text-muted-foreground">{t("description")}</p>
          </div>
        </article>

        {LANDING_CATEGORY_PANELS.map((panel, index) => (
          <article key={panel.titleKey} className="flex h-screen w-screen shrink-0 items-center px-8 sm:px-12">
            <div className="mx-auto grid w-full max-w-400 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14">
              <div className="order-2 space-y-5 self-center lg:order-1 lg:space-y-6">
                <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t(panel.tagKey)}</p>
                <h3 className="font-serif text-4xl leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">{t(panel.titleKey)}</h3>
                <p className="max-w-[280px] text-[13px]/relaxed text-muted-foreground">{t(panel.subtitleKey)}</p>
                <LocalizedLink
                  to="/collections"
                  className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t(panel.buttonTextKey)}
                </LocalizedLink>
              </div>
              <AspectRatio ratio={ASPECT_RATIO_PORTRAIT} className="order-1 w-full overflow-hidden bg-muted lg:order-2 lg:aspect-5/6">
                <Image
                  alt={t(panel.titleKey)}
                  className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-105"
                  height={1200}
                  priority={index === FIRST_INDEX}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  src={panel.image}
                  width={1000}
                />
              </AspectRatio>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

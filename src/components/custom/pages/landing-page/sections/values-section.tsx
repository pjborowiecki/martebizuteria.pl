import { type JSX, useRef } from "react";

import { useTranslations } from "use-intl";

import { gsap, useGSAP } from "~/src/lib/gsap";
import { getAssetURL } from "~/src/lib/utils";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";
import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";

const ASPECT_RATIO_PORTRAIT = 0.75;

function ValuesImage(): JSX.Element {
  const t = useTranslations("pages.landing.valuesSection");

  return (
    <AspectRatio className="parallax-wrap overflow-hidden bg-secondary" ratio={ASPECT_RATIO_PORTRAIT}>
      <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
        <Image
          alt={t("craft.title")}
          className="absolute inset-0 size-full object-cover"
          height={1000}
          sizes="(max-width: 768px) 100vw, 40vw"
          src={getAssetURL("marketing/standard.webp")}
          width={800}
        />
      </div>
    </AspectRatio>
  );
}

export function ValuesSection(): JSX.Element {
  const t = useTranslations("pages.landing.valuesSection");
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) {
        return;
      }

      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(section, {
          ease: "none",
          scrollTrigger: {
            end: "top 60%",
            scrub: true,
            start: "top bottom",
            trigger: section
          },
          yPercent: -15
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="values-section relative z-10 bg-background py-20 lg:py-32">
      <div className="mx-auto max-w-400 px-6 lg:px-12">
        <div className="reveal mb-12 max-w-xl space-y-3">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
        </div>

        <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-6 lg:gap-x-10">
          <div className="reveal md:col-span-5 md:row-span-2">
            <ValuesImage />
          </div>

          <div className="reveal flex flex-col justify-end space-y-3 md:col-span-7">
            <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
            <h3 className="font-serif text-2xl">{t("craft.title")}</h3>
            <p className="max-w-md text-sm/relaxed text-muted-foreground">{t("craft.description")}</p>
          </div>

          <div className="reveal flex flex-col justify-start space-y-3 md:col-span-3">
            <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
            <h3 className="font-serif text-2xl">{t("material.title")}</h3>
            <p className="text-sm/relaxed text-muted-foreground">{t("material.description")}</p>
          </div>

          <div className="reveal flex flex-col justify-start space-y-3 md:col-span-4">
            <Separator className="line-reveal mb-2 max-w-24 bg-foreground/30" />
            <h3 className="font-serif text-2xl">{t("service.title")}</h3>
            <p className="text-sm/relaxed text-muted-foreground">{t("service.description")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

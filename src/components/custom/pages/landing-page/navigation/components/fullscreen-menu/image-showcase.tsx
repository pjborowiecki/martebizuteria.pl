"use client";

import { useMemo, type JSX } from "react";

import { useTranslations } from "use-intl";

import { Image } from "~/src/components/custom/image";
import { PRIMARY } from "~/src/components/custom/pages/landing-page/navigation/constants";

const ACTIVE_INDEX = 0;

export function ImageShowcase(): JSX.Element {
  const t = useTranslations("components.custom.navigation");
  const containerStyle = useMemo(() => ({ perspective: "1000px" }), []);
  const activeStyle = useMemo(() => ({ opacity: 1, visibility: "inherit" as const }), []);
  const inactiveStyle = useMemo(() => ({ opacity: 0, visibility: "hidden" as const }), []);

  return (
    <div className="hidden w-1/2 items-center justify-center py-12 pr-12 lg:flex">
      <div
        data-menu-image-container
        className="relative aspect-3/4 w-[80%] max-w-md overflow-hidden rounded-sm shadow-2xl ring-1 ring-white/10"
        style={containerStyle}
      >
        {PRIMARY.map((item, i) => (
          <div key={item.hash} data-menu-image={i} className="absolute inset-0" style={i === ACTIVE_INDEX ? activeStyle : inactiveStyle}>
            <Image
              alt={t("menu.imageAlt")}
              className="absolute inset-0 h-full w-full object-cover object-center"
              height={1200}
              priority={i === ACTIVE_INDEX}
              sizes="(max-width: 1024px) 0vw, 40vw"
              src={item.image}
              width={900}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

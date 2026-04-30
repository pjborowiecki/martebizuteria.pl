"use client";

import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Image } from "~/src/components/custom/image";
import { PRIMARY } from "~/src/components/custom/landing/navigation/constants";

export function ImageShowcase(): JSX.Element {
  const t = useTranslations("components.custom.navigation");

  return (
    <div className="hidden w-1/2 items-center justify-center py-12 pr-12 lg:flex">
      <div
        data-menu-image-container
        className="relative aspect-3/4 w-[80%] max-w-md overflow-hidden rounded-sm shadow-2xl ring-1 ring-white/10"
        style={{ perspective: "1000px" }}
      >
        {PRIMARY.map((item, i) => (
          <div
            key={item.hash}
            data-menu-image={i}
            className="absolute inset-0"
            style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "inherit" : "hidden" }}
          >
            <Image
              alt={t("menu.imageAlt")}
              className="absolute inset-0 h-full w-full object-cover object-center"
              height={1200}
              priority={i === 0}
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

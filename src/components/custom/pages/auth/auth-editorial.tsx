import type { JSX } from "react";

import { useLocation } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { getAssetURL } from "~/src/lib/utils";

export function AuthEditorial(): JSX.Element {
  const t = useTranslations("components.custom.authLayout");
  const location = useLocation();
  const isSignUp = location.pathname.includes("sign-up");
  const image = getAssetURL(isSignUp ? "marketing/about.webp" : "marketing/hero.webp");

  return (
    <div className="relative hidden overflow-hidden bg-secondary lg:block">
      <img src={image} alt={t("imageAlt")} className="absolute inset-0 size-full object-cover transition-opacity duration-500" />
      <div className="absolute inset-0 bg-white/20" />
      <div className="absolute inset-x-8 bottom-8 xl:inset-x-12 xl:bottom-12">
        <p className="font-serif text-2xl leading-relaxed text-black xl:text-3xl">{t("imageQuote")}</p>
        <div className="mt-6 h-px w-8 bg-black/40" />
        <p className="mt-6 text-[10px] tracking-[0.25em] text-black/70 uppercase">{t("imageAttribution")}</p>
      </div>
    </div>
  );
}

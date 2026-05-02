"use client";

import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { useNavigation } from "~/src/components/custom/landing-page/navigation/components/navigation/navigation-provider";
import { LocalizedLink } from "~/src/components/custom/localized-link";

const SECONDARY_CLIENT_LINKS = [
  { href: "/account", labelKey: "menu.links.login" as const },
  { href: "/account", labelKey: "menu.links.myAccount" as const },
  { hasCount: true, href: "/cart", labelKey: "menu.links.cart" as const }
] as const;

export function SecondaryNav(): JSX.Element {
  const { handleNavigateToHash, handleClose } = useNavigation();
  const t = useTranslations("components.custom.navigation");
  const linkStyles =
    "font-light text-primary-foreground/70 text-xs uppercase tracking-[0.15em] transition-colors duration-300 ease-out hover:text-primary-foreground";

  const handleNavigateToMarka = useCallback(() => {
    handleNavigateToHash("#marka");
  }, [handleNavigateToHash]);

  return (
    <div data-menu-secondary className="mt-16 ml-12 flex flex-col gap-12 sm:mt-24 sm:ml-16 sm:flex-row sm:gap-40">
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.client")}</span>
        {SECONDARY_CLIENT_LINKS.map((entry) => {
          const { href, labelKey } = entry;
          const hasCount = "hasCount" in entry && entry.hasCount;
          return (
            <LocalizedLink key={labelKey} className={cn(linkStyles, hasCount && "flex items-center gap-2")} to={href} onClick={handleClose}>
              {t(labelKey)}{" "}
              {hasCount ? <span className="text-primary-foreground/40">{t("menu.links.cartCount", { count: 0 })}</span> : undefined}
            </LocalizedLink>
          );
        })}
      </div>
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.help")}</span>
        <button
          type="button"
          onClick={handleNavigateToMarka}
          className={cn("w-max cursor-pointer border-0 bg-transparent p-0 text-left outline-none", linkStyles)}
        >
          {t("menu.links.contact")}
        </button>
        <LocalizedLink to="/exchanges-and-returns" onClick={handleClose} className={linkStyles}>
          {t("menu.links.shipping")}
        </LocalizedLink>
        <LocalizedLink to="/faq" onClick={handleClose} className={linkStyles}>
          {t("menu.links.faq")}
        </LocalizedLink>
      </div>
    </div>
  );
}

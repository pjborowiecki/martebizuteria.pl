"use client";

import type { JSX } from "react";

import { CircleX } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { useNavigation } from "~/src/components/custom/landing-page/navigation/components/navigation/navigation-provider";
import { LocalizedLink } from "~/src/components/custom/localized-link";

export function MenuHeader(): JSX.Element {
  const { handleClose } = useNavigation();
  const t = useTranslations("components.custom.navigation");

  return (
    <div data-menu-header className="flex h-20 shrink-0 items-center justify-between px-6 lg:px-12">
      <LocalizedLink
        to="/"
        className="font-serif text-3xl tracking-tight text-primary-foreground uppercase md:text-4xl"
        onClick={handleClose}
      >
        {t("brand")}
      </LocalizedLink>
      <Button
        variant="ghost"
        className="group gap-3 text-primary-foreground/70 hover:bg-transparent hover:text-primary-foreground"
        size="sm"
        onClick={handleClose}
      >
        <span className="mt-0.5 text-xs font-light tracking-[0.2em] text-primary-foreground/70 uppercase">{t("closeMenu")}</span>
        <CircleX
          aria-hidden
          className="size-7 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-90"
          strokeWidth={1.25}
        />
      </Button>
    </div>
  );
}

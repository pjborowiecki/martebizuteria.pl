"use client";

import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { useNavigation } from "~/src/components/custom/landing-page/navigation/components/navigation/navigation-provider";
import { NAVIGATION_MENU_ID } from "~/src/components/custom/landing-page/navigation/constants";

function MenuMark(): JSX.Element {
  return (
    <span className="flex flex-col items-center justify-center gap-[5px]" aria-hidden>
      <span className="h-px w-[22px] bg-current" />
      <span className="h-px w-[11px] bg-current opacity-90" />
      <span className="h-px w-[22px] bg-current" />
    </span>
  );
}

export function MobileMenuToggle(): JSX.Element {
  const { menuOpen, setMenuOpen, getHoverProps } = useNavigation();
  const hover = getHoverProps({ scale: 1.06 });

  const t = useTranslations("components.custom.navigation");

  const handleMouseEnter = hover.onMouseEnter;
  const handleMouseLeave = hover.onMouseLeave;
  const handleOpenMenu = useCallback(() => {
    setMenuOpen(true);
  }, [setMenuOpen]);

  return (
    <Button
      variant="ghost"
      aria-expanded={menuOpen}
      aria-controls={NAVIGATION_MENU_ID}
      aria-label={t("openMenu")}
      onClick={handleOpenMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex h-10 shrink-0 items-center gap-2.5 rounded-none px-1.5 text-foreground transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent sm:gap-3 sm:px-2"
    >
      <span ref={hover.ref} className="inline-flex will-change-transform">
        <MenuMark />
      </span>
      <span className="hidden text-[10px] font-medium tracking-[0.28em] text-foreground/90 uppercase sm:inline" aria-hidden>
        {t("menuTrigger")}
      </span>
    </Button>
  );
}

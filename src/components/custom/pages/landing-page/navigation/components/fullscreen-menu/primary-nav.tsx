"use client";

import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";
import { PRIMARY } from "~/src/components/custom/pages/landing-page/navigation/constants";

const PAD_LENGTH = 2;

function PrimaryNavItem({
  item,
  index,
  handleNavigateToHash,
  handleHover
}: Readonly<{
  item: (typeof PRIMARY)[number];
  index: number;
  handleNavigateToHash: (hash: string) => void;
  handleHover: (index: number) => void;
}>) {
  const t = useTranslations("components.custom.navigation");

  const handleClick = useCallback(() => {
    handleNavigateToHash(item.hash);
  }, [handleNavigateToHash, item.hash]);

  const handleMouseEnter = useCallback(() => {
    handleHover(index);
  }, [handleHover, index]);

  return (
    <div className="overflow-hidden pb-1">
      <button
        type="button"
        data-menu-link
        className={cn(
          "group w-max cursor-pointer border-0 bg-transparent p-0 text-left font-serif text-5xl font-light tracking-tight text-primary-foreground uppercase transition-transform duration-300 ease-out will-change-transform outline-none hover:translate-x-2 hover:text-primary-foreground/70 sm:text-6xl xl:text-7xl"
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
      >
        <span className="relative top-3 mr-6 align-top font-sans text-xs tracking-[0.25em] text-primary-foreground/70 transition-colors duration-300 ease-out group-hover:text-primary-foreground/50 sm:top-5 sm:mr-8 sm:text-sm">
          {String(item.step).padStart(PAD_LENGTH, "0")}
        </span>
        {t(item.labelKey)}
        {item.italicKey ? (
          <span className="ml-3 text-primary-foreground/70 italic transition-colors duration-300 ease-out group-hover:text-primary-foreground/90">
            {t(item.italicKey)}
          </span>
        ) : undefined}
      </button>
    </div>
  );
}

export function PrimaryNav(): JSX.Element {
  const { handleNavigateToHash, handleHover } = useNavigation();
  const t = useTranslations("components.custom.navigation");

  return (
    <nav aria-label={t("overlayNavLabel")} className="flex flex-col gap-6 sm:gap-8">
      {PRIMARY.map((item, i) => (
        <PrimaryNavItem key={item.hash} item={item} index={i} handleNavigateToHash={handleNavigateToHash} handleHover={handleHover} />
      ))}
    </nav>
  );
}

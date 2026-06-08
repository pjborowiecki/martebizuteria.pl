import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { resolveLocalizedMenuPath } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-path";
import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";
import { PRIMARY } from "~/src/components/custom/pages/landing-page/navigation/constants";

const PAD_LENGTH = 2;

const PRIMARY_MENU_LINK_CLASS_NAME =
  "group w-max cursor-pointer border-0 bg-transparent p-0 text-left font-serif text-5xl font-light tracking-tight text-primary-foreground uppercase transition-transform duration-300 ease-out will-change-transform outline-none hover:translate-x-2 hover:text-primary-foreground/70 sm:text-6xl xl:text-7xl";

function PrimaryNavItemContent({
  item,
  t
}: Readonly<{
  item: (typeof PRIMARY)[number];
  t: ReturnType<typeof useTranslations>;
}>): JSX.Element {
  return (
    <>
      <span className="relative top-3 mr-6 align-top font-sans text-xs tracking-[0.25em] text-primary-foreground/70 transition-colors duration-300 ease-out group-hover:text-primary-foreground/50 sm:top-5 sm:mr-8 sm:text-sm">
        {String(item.step).padStart(PAD_LENGTH, "0")}
      </span>
      {t(item.labelKey)}
      {item.italicKey ? (
        <span className="ml-3 text-primary-foreground/70 italic transition-colors duration-300 ease-out group-hover:text-primary-foreground/90">
          {t(item.italicKey)}
        </span>
      ) : undefined}
    </>
  );
}

function PrimaryNavItem({
  dismissMenuForRouteNavigation,
  handleNavigateToHash,
  handleHover,
  index,
  item
}: Readonly<{
  dismissMenuForRouteNavigation: () => void;
  handleNavigateToHash: (hash: string) => void;
  handleHover: (index: number) => void;
  index: number;
  item: (typeof PRIMARY)[number];
}>): JSX.Element {
  const t = useTranslations("components.custom.navigation");

  const handleHashClick = useCallback(() => {
    handleNavigateToHash(item.hash);
  }, [handleNavigateToHash, item.hash]);

  const handleRouteClick = useCallback(() => {
    dismissMenuForRouteNavigation();
  }, [dismissMenuForRouteNavigation]);

  const handleMouseEnter = useCallback(() => {
    handleHover(index);
  }, [handleHover, index]);

  const localizedPath = item.hash.startsWith("/") ? resolveLocalizedMenuPath(item.hash) : undefined;

  return (
    <div className="overflow-hidden pb-1">
      {localizedPath === undefined ? (
        <button
          type="button"
          data-menu-link
          className={PRIMARY_MENU_LINK_CLASS_NAME}
          onClick={handleHashClick}
          onMouseEnter={handleMouseEnter}
        >
          <PrimaryNavItemContent item={item} t={t} />
        </button>
      ) : (
        <LocalizedLink
          className={cn(PRIMARY_MENU_LINK_CLASS_NAME, "inline-flex")}
          data-menu-link
          onClick={handleRouteClick}
          onMouseEnter={handleMouseEnter}
          params={localizedPath.params}
          to={localizedPath.to}
        >
          <PrimaryNavItemContent item={item} t={t} />
        </LocalizedLink>
      )}
    </div>
  );
}

export function PrimaryNav(): JSX.Element {
  const { dismissMenuForRouteNavigation, handleNavigateToHash, handleHover } = useNavigation();
  const t = useTranslations("components.custom.navigation");

  return (
    <nav aria-label={t("overlayNavLabel")} className="flex flex-col gap-6 sm:gap-8">
      {PRIMARY.map((item, i) => (
        <PrimaryNavItem
          key={item.hash}
          dismissMenuForRouteNavigation={dismissMenuForRouteNavigation}
          handleHover={handleHover}
          handleNavigateToHash={handleNavigateToHash}
          index={i}
          item={item}
        />
      ))}
    </nav>
  );
}

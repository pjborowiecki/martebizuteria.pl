import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { NavLink } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/nav-link";
import { NEW_ARRIVALS_COLLECTION_PATH, SILVER_925_COLLECTION_PATH } from "~/src/components/custom/pages/landing-page/navigation/constants";

interface NavConfig {
  hash: string;
  labelKey: "desktop.newArrivals" | "desktop.silver925" | "desktop.brand";
  active?: boolean;
}

const DESKTOP_LINKS: readonly NavConfig[] = [
  { active: false, hash: NEW_ARRIVALS_COLLECTION_PATH, labelKey: "desktop.newArrivals" },
  { active: false, hash: SILVER_925_COLLECTION_PATH, labelKey: "desktop.silver925" },
  { active: false, hash: CONSTANTS.ROUTES.ABOUT, labelKey: "desktop.brand" }
];

export function DesktopNav(): JSX.Element {
  const t = useTranslations("components.custom.navigation");

  return (
    <nav aria-label={t("desktopNavLabel")} className="hidden h-full min-w-0 items-center gap-8 text-muted-foreground lg:flex lg:gap-10">
      {DESKTOP_LINKS.map(({ hash, labelKey, active }) => (
        <NavLink key={hash} hash={hash} active={active}>
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

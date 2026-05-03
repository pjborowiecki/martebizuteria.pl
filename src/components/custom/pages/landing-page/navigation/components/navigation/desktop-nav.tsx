"use client";

import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { NavLink } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/nav-link";

interface NavConfig {
  hash: string;
  labelKey: "desktop.newArrivals" | "desktop.silver925" | "desktop.brand";
  active?: boolean;
}

const DESKTOP_LINKS: readonly NavConfig[] = [
  { active: false, hash: "#nowosci", labelKey: "desktop.newArrivals" },
  { active: true, hash: "#srebro", labelKey: "desktop.silver925" },
  { active: false, hash: "#marka", labelKey: "desktop.brand" }
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

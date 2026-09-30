import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { NavLink } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/nav-link"
import {
  GOLD_585_COLLECTION_PATH,
  NEW_ARRIVALS_COLLECTION_PATH,
  SILVER_925_COLLECTION_PATH,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

import { ROUTES } from "~/src/routes"

export const DesktopNav = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")

  return (
    <nav aria-label={t("desktopNavLabel")} className="hidden h-full min-w-0 items-center gap-8 text-muted-foreground xl:flex xl:gap-10">
      {DESKTOP_LINKS.map(({ hash, labelKey, active }) => (
        <NavLink key={hash} hash={hash} active={active}>
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

interface NavConfig {
  hash: string
  labelKey: "desktop.newArrivals" | "desktop.silver925" | "desktop.gold585" | "desktop.brand"
  active?: boolean
}

const DESKTOP_LINKS: readonly NavConfig[] = [
  { active: false, hash: NEW_ARRIVALS_COLLECTION_PATH, labelKey: "desktop.newArrivals" },
  { active: false, hash: SILVER_925_COLLECTION_PATH, labelKey: "desktop.silver925" },
  { active: false, hash: GOLD_585_COLLECTION_PATH, labelKey: "desktop.gold585" },
  { active: false, hash: ROUTES.ABOUT, labelKey: "desktop.brand" },
]

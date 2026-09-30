import { type JSX } from "react"

import { CircleX } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"

import { ROUTES } from "~/src/routes"

export const MenuHeader = (): JSX.Element => {
  const { dismissMenuForRouteNavigation, handleClose } = useNavigation()
  const t = useTranslations("components.custom.navigation")

  return (
    <div data-menu-header className="flex h-20 shrink-0 items-center justify-between px-6 lg:px-12">
      <LocalizedLink
        to={ROUTES.HOME}
        className="font-serif text-3xl tracking-tight text-primary-foreground uppercase md:text-4xl"
        onClick={dismissMenuForRouteNavigation}
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
  )
}

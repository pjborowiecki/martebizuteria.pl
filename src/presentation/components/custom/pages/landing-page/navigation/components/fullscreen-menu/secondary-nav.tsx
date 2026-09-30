import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { authEntryRouteFor } from "~/src/integrations/better-auth/auth.routes"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"

import { ROUTES } from "~/src/routes"

export const SecondaryNav = (): JSX.Element => {
  const { dismissMenuForRouteNavigation } = useNavigation()
  const { data: session } = useQuery(getCurrentSessionQuery)
  const t = useTranslations("components.custom.navigation")
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const authRoute = authEntryRouteFor(session?.user)

  return (
    <div data-menu-secondary className="mt-16 ml-12 flex flex-col gap-12 sm:mt-24 sm:ml-16 sm:flex-row sm:gap-40">
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.client")}</span>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={authRoute}>
          {t("menu.links.login")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={authRoute}>
          {t("menu.links.myAccount")}
        </LocalizedLink>
        <LocalizedLink className={cn(linkStyles, "flex items-center gap-2")} onClick={dismissMenuForRouteNavigation} to={ROUTES.CART}>
          {t("menu.links.cart")} <span className="text-primary-foreground/40">{t("menu.links.cartCount", { count: itemCount })}</span>
        </LocalizedLink>
      </div>
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.help")}</span>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={ROUTES.ABOUT}>
          {t("menu.links.contact")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={ROUTES.EXCHANGES_AND_RETURNS}>
          {t("menu.links.shipping")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={ROUTES.FAQ}>
          {t("menu.links.faq")}
        </LocalizedLink>
      </div>
    </div>
  )
}

const linkStyles =
  "font-light text-primary-foreground/70 text-xs uppercase tracking-[0.15em] transition-colors duration-300 ease-out hover:text-primary-foreground"

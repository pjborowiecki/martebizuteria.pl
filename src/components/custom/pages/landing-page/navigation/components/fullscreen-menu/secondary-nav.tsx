import { type JSX, useMemo } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { useSession } from "~/src/integrations/better-auth/auth._client";
import { localizedAuthEntryRouteFor, localizedPostAuthRouteFor } from "~/src/integrations/better-auth/auth.navigation";

import { cn } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";

import { useCartStore } from "~/src/stores/cart.store";

const INITIAL_CART_COUNT = 0;

const linkStyles =
  "font-light text-primary-foreground/70 text-xs uppercase tracking-[0.15em] transition-colors duration-300 ease-out hover:text-primary-foreground";

export function SecondaryNav(): JSX.Element {
  const { dismissMenuForRouteNavigation } = useNavigation();
  const { data: session } = useSession();
  const t = useTranslations("components.custom.navigation");

  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, INITIAL_CART_COUNT));

  const { accountRoute, loginRoute } = useMemo(() => {
    const user = session?.user;

    return {
      accountRoute: localizedAuthEntryRouteFor(user),
      loginRoute: user === undefined || user === null ? CONSTANTS.ROUTES.AUTH_SIGN_IN : localizedPostAuthRouteFor(user)
    };
  }, [session?.user]);

  return (
    <div data-menu-secondary className="mt-16 ml-12 flex flex-col gap-12 sm:mt-24 sm:ml-16 sm:flex-row sm:gap-40">
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.client")}</span>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={loginRoute}>
          {t("menu.links.login")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={accountRoute}>
          {t("menu.links.myAccount")}
        </LocalizedLink>
        <LocalizedLink
          className={cn(linkStyles, "flex items-center gap-2")}
          onClick={dismissMenuForRouteNavigation}
          to={CONSTANTS.ROUTES.CART}
        >
          {t("menu.links.cart")} <span className="text-primary-foreground/40">{t("menu.links.cartCount", { count: itemCount })}</span>
        </LocalizedLink>
      </div>
      <div className="flex flex-col gap-5">
        <span className="mb-2 text-xs font-light tracking-[0.2em] text-primary-foreground/50 uppercase">{t("menu.secondary.help")}</span>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={CONSTANTS.ROUTES.ABOUT}>
          {t("menu.links.contact")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={CONSTANTS.ROUTES.EXCHANGES_AND_RETURNS}>
          {t("menu.links.shipping")}
        </LocalizedLink>
        <LocalizedLink className={linkStyles} onClick={dismissMenuForRouteNavigation} to={CONSTANTS.ROUTES.FAQ}>
          {t("menu.links.faq")}
        </LocalizedLink>
      </div>
    </div>
  );
}

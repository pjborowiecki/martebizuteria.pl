"use client";

import { type JSX, useCallback } from "react";

import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "use-intl";
import { useShallow } from "zustand/react/shallow";

import { CONSTANTS } from "~/src/constants";

import { cn } from "~/src/lib/utils";

import { Button, buttonVariants } from "~/src/components/shadcn/button";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";
import { useNavigationStore } from "~/src/components/custom/pages/landing-page/navigation/store/navigation-store";

import { useCartStore } from "~/src/stores/cart.store";

const utilityIcon = "size-[1.125rem] text-foreground";
const INITIAL_COUNT = 0;

export function UserUtilityNav(): JSX.Element {
  const t = useTranslations("components.custom.navigation");
  const { getHoverProps } = useNavigation();
  const searchHover = getHoverProps();
  const accountHover = getHoverProps();
  const cartHover = getHoverProps({ scale: 1.06 });
  const setSearchOpen = useNavigationStore(useShallow((s) => s.setSearchOpen));

  const { items } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.qty, INITIAL_COUNT);

  const handleSearchMouseEnter = searchHover.onMouseEnter;
  const handleSearchMouseLeave = searchHover.onMouseLeave;
  const handleAccountMouseEnter = accountHover.onMouseEnter;
  const handleAccountMouseLeave = accountHover.onMouseLeave;
  const handleCartMouseEnter = cartHover.onMouseEnter;
  const handleCartMouseLeave = cartHover.onMouseLeave;

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
  }, [setSearchOpen]);

  return (
    <div className="flex h-full min-w-0 items-center justify-end gap-1 justify-self-end text-foreground sm:gap-1.5">
      <Button
        size="icon"
        variant="ghost"
        aria-label={t("search")}
        onClick={handleOpenSearch}
        onMouseEnter={handleSearchMouseEnter}
        onMouseLeave={handleSearchMouseLeave}
        className="inline-flex size-10 shrink-0 rounded-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent"
      >
        <span ref={searchHover.ref} className="inline-flex will-change-transform">
          <Search aria-hidden className={utilityIcon} strokeWidth={1.15} />
        </span>
      </Button>
      <LocalizedLink
        to={CONSTANTS.ROUTES.ACCOUNT}
        aria-label={t("account")}
        onMouseEnter={handleAccountMouseEnter}
        onMouseLeave={handleAccountMouseLeave}
        className={cn(
          buttonVariants({ size: "icon", variant: "ghost" }),
          "size-10 rounded-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent sm:inline-flex"
        )}
      >
        <span ref={accountHover.ref} className="inline-flex will-change-transform">
          <UserRound aria-hidden className={utilityIcon} strokeWidth={1.15} />
        </span>
      </LocalizedLink>
      <LocalizedLink
        to={CONSTANTS.ROUTES.CART}
        aria-label={t("cart")}
        onMouseEnter={handleCartMouseEnter}
        onMouseLeave={handleCartMouseLeave}
        className={cn(
          buttonVariants({ size: "icon", variant: "ghost" }),
          "flex h-10 min-w-11 items-center justify-center rounded-none px-2 transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent sm:min-w-12 sm:px-2.5"
        )}
      >
        <span ref={cartHover.ref} className="inline-flex items-center gap-2 will-change-transform">
          <ShoppingBag aria-hidden className={utilityIcon} strokeWidth={1.15} />
          <span className="text-[11px] font-light tracking-[0.2em] text-foreground/90 tabular-nums">{itemCount}</span>
        </span>
      </LocalizedLink>
    </div>
  );
}

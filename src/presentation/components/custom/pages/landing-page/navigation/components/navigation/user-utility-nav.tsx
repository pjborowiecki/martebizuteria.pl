import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { Search, ShoppingBag, UserRound } from "lucide-react"
import { useTranslations } from "use-intl"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"
import { useCartStore } from "~/src/stores/cart.store"
export const UserUtilityNav = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const { getHoverProps } = useNavigation()
  const searchHover = getHoverProps()
  const accountHover = getHoverProps()
  const cartHover = getHoverProps({ scale: 1.06 })
  const setSearchOpen = useNavigationStore((state) => state.setSearchOpen)
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true)
  }, [setSearchOpen])
  return (
    <div className="flex h-full min-w-0 items-center justify-end gap-1 justify-self-end text-foreground sm:gap-1.5">
      <Button
        size="icon"
        variant="ghost"
        aria-label={t("search")}
        onClick={handleOpenSearch}
        onMouseEnter={searchHover.onMouseEnter}
        onMouseLeave={searchHover.onMouseLeave}
        className="inline-flex size-10 shrink-0 rounded-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent"
      >
        <span ref={searchHover.ref} className="inline-flex will-change-transform">
          <Search aria-hidden className={utilityIcon} strokeWidth={1.15} />
        </span>
      </Button>
      <LocalizedLink
        to={ROUTES.ACCOUNT}
        aria-label={t("account")}
        onMouseEnter={accountHover.onMouseEnter}
        onMouseLeave={accountHover.onMouseLeave}
        className={cn(
          buttonVariants({ size: "icon", variant: "ghost" }),
          "size-10 rounded-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent sm:inline-flex",
        )}
      >
        <span ref={accountHover.ref} className="inline-flex will-change-transform">
          <UserRound aria-hidden className={utilityIcon} strokeWidth={1.15} />
        </span>
      </LocalizedLink>
      <LocalizedLink
        to={ROUTES.CART}
        aria-label={t("cart")}
        onMouseEnter={cartHover.onMouseEnter}
        onMouseLeave={cartHover.onMouseLeave}
        className={cn(
          buttonVariants({ size: "icon", variant: "ghost" }),
          "flex h-10 min-w-11 items-center justify-center rounded-none px-2 transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent active:bg-transparent aria-expanded:bg-transparent sm:min-w-12 sm:px-2.5",
        )}
      >
        <span ref={cartHover.ref} className="inline-flex items-center gap-2 will-change-transform">
          <ShoppingBag aria-hidden className={utilityIcon} strokeWidth={1.15} />
          <span aria-live="polite" aria-atomic="true" className="text-[11px] font-light tracking-[0.2em] text-foreground/90 tabular-nums">
            {itemCount}
          </span>
        </span>
      </LocalizedLink>
    </div>
  )
}
const utilityIcon = "size-[1.125rem] text-foreground"

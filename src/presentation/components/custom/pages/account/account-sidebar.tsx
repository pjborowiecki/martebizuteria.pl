import { type JSX, useEffect, useRef } from "react"

import { useMutation } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { CreditCard, Heart, LayoutDashboard, Loader2, LogOut, MapPin, Package, Shield, User } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const HALF = 0.5

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

export const AccountSidebar = (): JSX.Element => {
  const t = useTranslations("pages.account.sidebar")
  const router = useRouter()
  const pathname = useLocation({ select: (location) => location.pathname })
  const navRef = useRef<HTMLElement>(null)
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await signOutRequest({})

      if (error) {
        throw new Error(error.message ?? "Failed to sign out")
      }
    },
    onError: () => {
      toast.error(t("signOutError"))
    },
    onSuccess: () => {
      globalThis.location.href = router.buildLocation({
        to: "/",
      }).publicHref
    },
  })

  useEffect(() => {
    const nav = navRef.current
    const activeTab = nav?.querySelector('[aria-current="page"]')
    if (nav !== null && activeTab instanceof HTMLElement) {
      const navBox = nav.getBoundingClientRect()
      const tabBox = activeTab.getBoundingClientRect()
      nav.scrollLeft += tabBox.left - navBox.left - (navBox.width - tabBox.width) * HALF
    }
  }, [pathname])

  const SignOutIcon = signOutMutation.isPending ? Loader2 : LogOut
  const onSignOutClick = (): void => {
    signOutMutation.mutate()
  }

  return (
    <aside className="min-w-0 lg:sticky lg:top-28 lg:w-[220px] lg:shrink-0 lg:self-start">
      <div className="flex items-start gap-1 lg:flex-col lg:items-stretch lg:gap-0 lg:space-y-1">
        <div className="mb-4 hidden px-2 lg:block">
          <h2 className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("title")}</h2>
          <Separator className="mt-4" />
        </div>

        <nav
          aria-label={t("title")}
          ref={navRef}
          className="-ml-4 flex min-w-0 flex-1 snap-x scroll-pl-4 gap-1 overflow-x-auto mask-r-from-[calc(100%-1.5rem)] mask-l-from-[calc(100%-1rem)] pr-6 pb-2 pl-4 sm:-ml-9 sm:scroll-pl-9 sm:pl-9 lg:mx-0 lg:flex-none lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible lg:mask-none lg:px-0 lg:pb-0"
        >
          {SIDEBAR_LINKS.map((link) => (
            <LocalizedLink
              activeOptions={link.key === "overview" ? EXACT_MATCH : PREFIX_MATCH}
              activeProps={ACTIVE_PROPS}
              className="relative flex min-h-10 shrink-0 snap-start items-center gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] transition-colors lg:min-h-auto"
              inactiveProps={INACTIVE_PROPS}
              key={link.key}
              resetScroll={false}
              to={link.href}
            >
              <link.icon className="size-4 shrink-0" strokeWidth={1.5} />
              {t(link.key)}
            </LocalizedLink>
          ))}
        </nav>

        <div className="hidden py-4 lg:block">
          <Separator />
        </div>

        <Button
          className="flex size-10 cursor-pointer items-center justify-center gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:h-8 lg:w-full lg:justify-start"
          disabled={signOutMutation.isPending}
          onClick={onSignOutClick}
          variant="ghost"
        >
          <SignOutIcon
            aria-hidden
            className={signOutMutation.isPending ? "size-4 shrink-0 animate-spin" : "size-4 shrink-0"}
            strokeWidth={1.5}
          />
          <span className="sr-only lg:not-sr-only">{t("signOut")}</span>
        </Button>
      </div>
    </aside>
  )
}

const SIDEBAR_LINKS = [
  {
    href: ROUTES.ACCOUNT_OVERVIEW,
    icon: LayoutDashboard,
    key: "overview",
  },
  {
    href: ROUTES.ACCOUNT_PROFILE,
    icon: User,
    key: "profile",
  },
  {
    href: ROUTES.ACCOUNT_ORDERS,
    icon: Package,
    key: "orders",
  },
  {
    href: ROUTES.ACCOUNT_ADDRESSES,
    icon: MapPin,
    key: "addresses",
  },
  {
    href: ROUTES.ACCOUNT_PAYMENT,
    icon: CreditCard,
    key: "payment",
  },
  {
    href: ROUTES.ACCOUNT_WISHLIST,
    icon: Heart,
    key: "wishlist",
  },
  {
    href: ROUTES.ACCOUNT_SESSIONS,
    icon: Shield,
    key: "sessions",
  },
] as const

const ACTIVE_PROPS = {
  className:
    "bg-muted/50 font-medium text-foreground lg:before:absolute lg:before:inset-y-1 lg:before:left-0 lg:before:w-0.5 lg:before:rounded-r-md lg:before:bg-foreground",
}

const INACTIVE_PROPS = {
  className: "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
}

const EXACT_MATCH = {
  exact: true,
} as const

const PREFIX_MATCH = {
  exact: false,
} as const

import { type JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { CreditCard, Heart, LayoutDashboard, Loader2, LogOut, MapPin, Package, Shield, User } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

export const AccountSidebar = (): JSX.Element => {
  const t = useTranslations("pages.account.sidebar")
  const router = useRouter()
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

  const SignOutIcon = signOutMutation.isPending ? Loader2 : LogOut
  const onSignOutClick = (): void => {
    signOutMutation.mutate()
  }

  return (
    <aside className="lg:sticky lg:top-28 lg:w-[220px] lg:shrink-0 lg:self-start">
      <div className="flex flex-col space-y-1">
        <div className="mb-4 hidden px-2 lg:block">
          <h2 className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("title")}</h2>
          <Separator className="mt-4" />
        </div>

        <nav
          aria-label={t("title")}
          className="-mx-6 flex snap-x gap-1 overflow-x-auto px-6 pb-2 sm:-mx-12 sm:px-12 lg:mx-0 lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {SIDEBAR_LINKS.map((link) => (
            <LocalizedLink
              activeOptions={link.key === "overview" ? EXACT_MATCH : PREFIX_MATCH}
              activeProps={ACTIVE_PROPS}
              className="relative flex shrink-0 snap-start items-center gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] transition-colors"
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

        <div className="py-4">
          <Separator />
        </div>

        <Button
          className="flex w-full cursor-pointer items-center justify-start gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          disabled={signOutMutation.isPending}
          onClick={onSignOutClick}
          variant="ghost"
        >
          <SignOutIcon
            aria-hidden
            className={signOutMutation.isPending ? "size-4 shrink-0 animate-spin" : "size-4 shrink-0"}
            strokeWidth={1.5}
          />
          {t("signOut")}
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

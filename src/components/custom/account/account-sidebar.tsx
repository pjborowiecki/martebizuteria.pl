"use client";

import type { JSX } from "react";

import { CreditCard, Heart, LayoutDashboard, LogOut, MapPin, Package, Shield, User } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { LocalizedLink } from "~/src/components/custom/localized-link";

const SIDEBAR_LINKS = [
  { href: CONSTANTS.ROUTES.ACCOUNT_OVERVIEW, icon: LayoutDashboard, key: "overview" },
  { href: CONSTANTS.ROUTES.ACCOUNT_PROFILE, icon: User, key: "profile" },
  { href: CONSTANTS.ROUTES.ACCOUNT_ORDERS, icon: Package, key: "orders" },
  { href: CONSTANTS.ROUTES.ACCOUNT_ADDRESSES, icon: MapPin, key: "addresses" },
  { href: CONSTANTS.ROUTES.ACCOUNT_PAYMENT, icon: CreditCard, key: "payment" },
  { href: CONSTANTS.ROUTES.ACCOUNT_WISHLIST, icon: Heart, key: "wishlist" },
  { href: CONSTANTS.ROUTES.ACCOUNT_SESSIONS, icon: Shield, key: "sessions" }
] as const;

const ACTIVE_PROPS = {
  className:
    "bg-muted/50 font-medium text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-md before:bg-foreground"
};

const INACTIVE_PROPS = {
  className: "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
};

const EXACT_MATCH = { exact: true } as const;

export function AccountSidebar(): JSX.Element {
  const t = useTranslations("account.sidebar");

  return (
    <aside className="hidden lg:sticky lg:top-28 lg:block lg:w-[220px] lg:shrink-0 lg:self-start">
      <div className="flex flex-col space-y-1">
        <div className="mb-4 px-2">
          <h2 className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("title")}</h2>
          <Separator className="mt-4" />
        </div>

        <nav className="flex flex-col space-y-1">
          {SIDEBAR_LINKS.map((link) => (
            <LocalizedLink
              key={link.key}
              to={link.href}
              activeProps={ACTIVE_PROPS}
              inactiveProps={INACTIVE_PROPS}
              activeOptions={link.key === "overview" ? EXACT_MATCH : undefined}
              resetScroll={false}
              className="relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] transition-colors"
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
          variant="ghost"
          className="flex w-full cursor-pointer items-center justify-start gap-3 rounded-md px-3 py-2 text-[13px] tracking-[0.02em] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.5} />
          {t("signOut")}
        </Button>
      </div>
    </aside>
  );
}

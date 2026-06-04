import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Heart, Package, Sparkles, Star } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { Route as AccountRoute } from "~/src/routes/{-$locale}.account";

export const Route = createFileRoute("/{-$locale}/account/overview")({
  component: AccountOverviewPage
});

const STATS = [
  { key: "totalSpent" as const, value: "€ 4,270.00" },
  { key: "totalOrders" as const, value: "12" },
  { key: "wishlistItems" as const, value: "6" },
  { key: "memberSince" as const, value: "2023" }
];

const ACTIVITY_FEED: {
  key: "orderDelivered" | "orderShipped" | "wishlistAdded" | "addressUpdated" | "reviewPosted";
  params: Record<string, string>;
  time: string;
  icon: typeof Package;
}[] = [
  { icon: Package, key: "orderDelivered", params: { id: "ORD-1847" }, time: "2d" },
  { icon: Package, key: "orderShipped", params: { id: "ORD-1832" }, time: "5d" },
  { icon: Heart, key: "wishlistAdded", params: { item: "Midnight Choker" }, time: "1w" },
  { icon: Sparkles, key: "addressUpdated", params: {}, time: "1w" },
  { icon: Star, key: "reviewPosted", params: { item: "Aurelia Gold Ring" }, time: "2w" }
];

const RECOMMENDATIONS = [
  {
    id: "rec-1",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80",
    name: "Celestial Diamond Necklace",
    price: "€ 1,890.00"
  },
  {
    id: "rec-2",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=400&q=80",
    name: "Azure Sapphire Ring",
    price: "€ 1,240.00"
  },
  {
    id: "rec-3",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80",
    name: "Pearl Drop Earrings",
    price: "€ 680.00"
  }
];

const LOYALTY_POINTS = 2450;
const LOYALTY_NEXT_TIER_POINTS = 550;
const LOYALTY_PROGRESS_MAX = 3000;
const PERCENTAGE_MULTIPLIER = 100;
const LOYALTY_PROGRESS_PERCENT = Math.round((LOYALTY_POINTS / LOYALTY_PROGRESS_MAX) * PERCENTAGE_MULTIPLIER);
const LOYALTY_PROGRESS_STYLE = { width: `${LOYALTY_PROGRESS_PERCENT}%` } as const;

function StatsGrid(): JSX.Element {
  const t = useTranslations("pages.account.overview");

  return (
    <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      {STATS.map((stat) => (
        <div key={stat.key} className="bg-background px-5 py-6">
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase">{t(`stats.${stat.key}`)}</p>
          <p className="mt-2 font-serif text-2xl tracking-tight lg:text-3xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed(): JSX.Element {
  const t = useTranslations("pages.account.overview");

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("activity")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        {ACTIVITY_FEED.map((item) => (
          <div key={`${item.key}-${item.time}`} className="flex items-center gap-4 py-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center">
              <item.icon className="size-3.5 text-muted-foreground/50" strokeWidth={1.2} />
            </div>
            <p className="min-w-0 flex-1 text-[13px] text-foreground/80">{t(`activityItems.${item.key}`, item.params)}</p>
            <span className="shrink-0 text-[11px] text-muted-foreground/50 tabular-nums">{item.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ item }: Readonly<{ item: (typeof RECOMMENDATIONS)[number] }>): JSX.Element {
  return (
    <LocalizedLink to={CONSTANTS.ROUTES.PRODUCTS} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          width={400}
          height={533}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        <p className="text-[13px] tracking-[0.02em]">{item.name}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">{item.price}</p>
      </div>
    </LocalizedLink>
  );
}

function Recommendations(): JSX.Element {
  const t = useTranslations("pages.account.overview");

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("recommendations")}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground/60">{t("recommendationsDesc")}</p>
        </div>
        <LocalizedLink
          to={CONSTANTS.ROUTES.PRODUCTS}
          className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("viewProduct")}
          <ArrowRight className="size-3" strokeWidth={1.5} />
        </LocalizedLink>
      </div>
      <Separator className="mt-3 mb-6" />
      <div className="grid gap-5 sm:grid-cols-3">
        {RECOMMENDATIONS.map((item) => (
          <RecommendationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function LoyaltyCard(): JSX.Element {
  const t = useTranslations("pages.account.overview");

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("loyalty")}</h2>
      <Separator className="mt-3 mb-0" />

      <div className="py-6">
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-xl tracking-tight">{t("loyaltyTier", { tier: t("tierGold") })}</p>
          <p className="text-[12px] text-muted-foreground tabular-nums">
            {t("loyaltyPoints", { points: LOYALTY_POINTS.toLocaleString() })}
          </p>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all duration-700" style={LOYALTY_PROGRESS_STYLE} />
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground/60">
          {t("loyaltyNext", { points: LOYALTY_NEXT_TIER_POINTS, tier: t("tierPlatinum") })}
        </p>
      </div>
    </section>
  );
}

const FIRST_NAME_INDEX = 0;

function AccountOverviewPage(): JSX.Element {
  const t = useTranslations("pages.account.overview");
  const { user } = AccountRoute.useRouteContext();
  const firstName = user.name.split(" ")[FIRST_NAME_INDEX] ?? user.name;

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("greeting")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title", { name: firstName })}</h1>
      </div>

      <StatsGrid />

      <Separator className="my-10" />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ActivityFeed />
        <LoyaltyCard />
      </div>

      <Separator className="my-10" />

      <Recommendations />
    </div>
  );
}

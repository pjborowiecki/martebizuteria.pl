import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight, Heart, Package, Sparkles } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { formatCustomerAccountRelativeTime, formatCustomerOrderDisplayId } from "~/src/modules/customer-account/customer-account.utils"
import { getCustomerOverviewQuery } from "~/src/modules/customer-account/use-cases/get-customer-overview"

import { Route as AccountRoute } from "~/src/routes/account"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const StatsGrid = ({
  memberSinceYear,
  totalOrders,
  totalSpentLabel,
  wishlistCount,
}: Readonly<{
  memberSinceYear: string
  totalOrders: number
  totalSpentLabel: string
  wishlistCount: number
}>): JSX.Element => {
  const t = useTranslations("pages.account.overview")
  const stats = [
    {
      key: "totalSpent" as const,
      value: totalSpentLabel,
    },
    {
      key: "totalOrders" as const,
      value: String(totalOrders),
    },
    {
      key: "wishlistItems" as const,
      value: String(wishlistCount),
    },
    {
      key: "memberSince" as const,
      value: memberSinceYear,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.key} className="bg-background px-5 py-6">
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase">{t(`stats.${stat.key}`)}</p>
          <p className="mt-2 font-serif text-2xl tracking-tight lg:text-3xl">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

const ActivityFeed = ({
  activity,
}: Readonly<{
  activity: readonly CustomerAccount["activityItem"][]
}>): JSX.Element => {
  const t = useTranslations("pages.account.overview")
  const locale = useLocale()

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("activity")}</h2>
      <Separator className="mt-3 mb-0" />
      {activity.length === 0 ? (
        <p className="py-6 text-[13px] text-muted-foreground">{t("noActivity")}</p>
      ) : (
        <div className="divide-y divide-border">
          {activity.map((item) => {
            const Icon = ACTIVITY_ICONS[item.actionKey] ?? Package

            return (
              <div key={`${item.actionKey}-${item.createdAt.toISOString()}`} className="flex items-center gap-4 py-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center">
                  <Icon className="size-3.5 text-muted-foreground/50" strokeWidth={1.2} />
                </div>
                <p className="min-w-0 flex-1 text-[13px] text-foreground/80">{t(`activityItems.${item.actionKey}`, item.params)}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground/50 tabular-nums">
                  {formatCustomerAccountRelativeTime(item.createdAt, locale)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const RecentOrders = ({
  orders,
}: Readonly<{
  orders: readonly CustomerAccount["orderSummary"][]
}>): JSX.Element => {
  const t = useTranslations("pages.account.overview")
  const format = useFormatter()

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("recentOrders")}</h2>
        <LocalizedLink
          to={ROUTES.ACCOUNT_ORDERS}
          className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("viewAllOrders")}
          <ArrowRight className="size-3" strokeWidth={1.5} />
        </LocalizedLink>
      </div>
      <Separator className="mt-3 mb-0" />
      {orders.length === 0 ? (
        <p className="py-6 text-[13px] text-muted-foreground">{t("noRecentOrders")}</p>
      ) : (
        <div className="divide-y divide-border">
          {orders.map((order) => {
            const displayId = formatCustomerOrderDisplayId(order.id)
            const totalLabel = format.number(centsToDisplayAmount(order.totalMinorUnits), {
              currency: order.currencyCode,
              style: "currency",
            })

            return (
              <RecentOrderLink
                key={order.id}
                createdAt={order.createdAt}
                displayId={displayId}
                filterStatus={order.filterStatus}
                orderId={order.id}
                totalLabel={totalLabel}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

const RecentOrderLink = ({
  createdAt,
  displayId,
  filterStatus,
  orderId,
  totalLabel,
}: Readonly<{
  createdAt: Date
  displayId: string
  filterStatus: CustomerAccount["orderSummary"]["filterStatus"]
  orderId: string
  totalLabel: string
}>): JSX.Element => {
  const tOrders = useTranslations("pages.account.orders")
  const format = useFormatter()
  const orderParams = useMemo(
    () => ({
      id: orderId,
    }),
    [orderId],
  )

  return (
    <LocalizedLink
      to={ROUTES.ACCOUNT_ORDER}
      params={orderParams}
      className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-muted-foreground"
    >
      <div>
        <p className="text-[13px] tracking-[0.02em]">{displayId}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {format.dateTime(createdAt, {
            dateStyle: "medium",
          })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] tabular-nums">{totalLabel}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">{tOrders(`status.${filterStatus}`)}</p>
      </div>
    </LocalizedLink>
  )
}

const RecommendationCard = ({
  handle,
  image,
  name,
  priceLabel,
}: Readonly<{
  handle: string
  image?: string | undefined
  name: string
  priceLabel?: string | undefined
}>): JSX.Element => {
  const productParams = useMemo(
    () => ({
      handle,
    }),
    [handle],
  )

  return (
    <LocalizedLink to={ROUTES.PRODUCT} params={productParams} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {image === undefined ? undefined : (
          <Image
            src={image}
            alt={name}
            width={400}
            height={533}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
      </div>
      <div className="mt-3">
        <p className="text-[13px] tracking-[0.02em]">{name}</p>
        {priceLabel === undefined ? undefined : <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">{priceLabel}</p>}
      </div>
    </LocalizedLink>
  )
}

const Recommendations = ({
  recommendations,
}: Readonly<{
  recommendations: readonly {
    handle: string
    image?: string | undefined
    name: string
    priceMinorUnits?: number | undefined
  }[]
}>): JSX.Element => {
  const t = useTranslations("pages.account.overview")
  const format = useFormatter()

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("recommendations")}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground/60">{t("recommendationsDesc")}</p>
        </div>
        <LocalizedLink
          to={ROUTES.PRODUCTS}
          className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("viewProduct")}
          <ArrowRight className="size-3" strokeWidth={1.5} />
        </LocalizedLink>
      </div>
      <Separator className="mt-3 mb-6" />
      {recommendations.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t("noRecommendations")}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3">
          {recommendations.map((item) => (
            <RecommendationCard
              key={item.handle}
              handle={item.handle}
              image={item.image}
              name={item.name}
              priceLabel={
                item.priceMinorUnits === undefined
                  ? undefined
                  : format.number(centsToDisplayAmount(item.priceMinorUnits), {
                      currency: "PLN",
                      style: "currency",
                    })
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

const AccountOverviewPage = (): JSX.Element => {
  const t = useTranslations("pages.account.overview")
  const locale = useLocale()
  const format = useFormatter()
  const { user } = AccountRoute.useRouteContext()
  const { data: overviewData } = useSuspenseQuery(getCustomerOverviewQuery(locale))
  const overview = overviewData ?? {
    activity: [],
    recentOrders: [],
    recommendations: [],
    stats: {
      memberSinceYear: String(new Date().getFullYear()),
      totalOrders: 0,
      totalSpentMinorUnits: 0,
      wishlistCount: 0,
    },
  }

  const firstName = user.name.split(" ")[0] ?? user.name
  const totalSpentLabel = format.number(centsToDisplayAmount(overview.stats.totalSpentMinorUnits), {
    currency: "PLN",
    style: "currency",
  })

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("greeting")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">
          {t("title", {
            name: firstName,
          })}
        </h1>
      </div>

      <StatsGrid
        memberSinceYear={overview.stats.memberSinceYear}
        totalOrders={overview.stats.totalOrders}
        totalSpentLabel={totalSpentLabel}
        wishlistCount={overview.stats.wishlistCount}
      />

      <Separator className="my-10" />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ActivityFeed activity={overview.activity} />
        <RecentOrders orders={overview.recentOrders} />
      </div>

      <Separator className="my-10" />

      <Recommendations recommendations={overview.recommendations} />
    </div>
  )
}

export const Route = createFileRoute("/account/overview")({
  component: AccountOverviewPage,
  loader: ({ context }) =>
    context.queryClient.query({
      ...getCustomerOverviewQuery(context.locale),
      staleTime: "static",
    }),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})

const ACTIVITY_ICONS: Record<string, typeof Package> = {
  cartItemAdded: Heart,
  loginFailed: Sparkles,
  loginSuccess: Sparkles,
  logout: Sparkles,
  orderDelivered: Package,
  orderPlaced: Package,
  orderShipped: Package,
}

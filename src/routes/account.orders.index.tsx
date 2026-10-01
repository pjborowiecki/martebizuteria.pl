import { type JSX, useCallback, useId, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import {
  CUSTOMER_ACCOUNT_ORDER_FILTERS,
  CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  type CustomerAccountOrderFilter,
} from "~/src/modules/customer-account/customer-account.constants"
import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { listCustomerOrdersQuery } from "~/src/modules/customer-account/use-cases/list-customer-orders"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"
import { pageHead } from "~/src/lib/seo"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const ordersSearchSchema = zod.object({
  filter: zod.enum(CUSTOMER_ACCOUNT_ORDER_FILTERS).default("all"),
  page: zod.coerce.number().int().min(1).default(1),
})

type OrdersSearch = zod.output<typeof ordersSearchSchema>

const OrdersPage = (): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const { filter, page } = Route.useSearch()
  const { data: ordersPage } = useSuspenseQuery(listCustomerOrdersQuery({ filter, page }))
  const lastPage = Math.max(Math.ceil(ordersPage.total / ordersPage.pageSize), FIRST_PAGE)

  return (
    <div>
      <div className="sticky top-20 z-10 -mx-6 bg-background px-6 pt-6 sm:-mx-12 sm:px-12 lg:mx-0 lg:px-0 lg:pt-0">
        <div className="mb-10 space-y-3">
          <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {CUSTOMER_ACCOUNT_ORDER_FILTERS.map((option) => (
            <FilterLink key={option} currentFilter={filter} option={option} />
          ))}
        </div>
        <Separator className="mt-4 mb-0" />
      </div>

      <div className="pt-4">
        {ordersPage.orders.length === 0 ? (
          <OrdersEmptyState filter={filter} />
        ) : (
          <div className="divide-y divide-border pb-10">
            {ordersPage.orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}

        {lastPage > FIRST_PAGE && <OrdersPagination filter={filter} lastPage={lastPage} page={ordersPage.page} />}
      </div>
    </div>
  )
}

const OrdersEmptyState = ({ filter }: Readonly<{ filter: CustomerAccountOrderFilter }>): JSX.Element => {
  const t = useTranslations("pages.account.orders")

  if (filter === "all") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("emptyAll")}</p>
        <LocalizedLink
          className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
          to={ROUTES.PRODUCTS}
        >
          {t("browseProducts")}
        </LocalizedLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm text-muted-foreground">{t("emptyFiltered", { filter: t(`filter.${filter}`) })}</p>
      <Link
        className="text-[11px] tracking-[0.15em] text-foreground uppercase underline underline-offset-4"
        search={ALL_ORDERS_SEARCH}
        to={ROUTES.ACCOUNT_ORDERS}
      >
        {t("showAll")}
      </Link>
    </div>
  )
}

const OrdersPagination = ({
  filter,
  lastPage,
  page,
}: Readonly<{
  filter: CustomerAccountOrderFilter
  lastPage: number
  page: number
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-between border-t border-border pt-6 pb-10">
      <PaginationLink disabled={page <= FIRST_PAGE} filter={filter} label={t("previousPage")} page={page - PAGE_STEP} />
      <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("pageOf", { page, total: lastPage })}</p>
      <PaginationLink disabled={page >= lastPage} filter={filter} label={t("nextPage")} page={page + PAGE_STEP} />
    </nav>
  )
}

const PaginationLink = ({
  disabled,
  filter,
  label,
  page,
}: Readonly<{
  disabled: boolean
  filter: CustomerAccountOrderFilter
  label: string
  page: number
}>): JSX.Element => {
  const search = useMemo(() => ({ filter, page }), [filter, page])

  if (disabled) {
    return <span className="text-[11px] tracking-[0.15em] text-muted-foreground/40 uppercase">{label}</span>
  }

  return (
    <Link className="text-[11px] tracking-[0.15em] text-foreground uppercase hover:underline" search={search} to={ROUTES.ACCOUNT_ORDERS}>
      {label}
    </Link>
  )
}

const FilterLink = ({
  currentFilter,
  option,
}: Readonly<{
  currentFilter: CustomerAccountOrderFilter
  option: CustomerAccountOrderFilter
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const isActive = currentFilter === option
  const search = useMemo(() => ({ filter: option, page: FIRST_PAGE }), [option])

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "account-ghost" }),
        "tracking-[0.18em]",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      search={search}
      to={ROUTES.ACCOUNT_ORDERS}
    >
      {t(`filter.${option}`)}
    </Link>
  )
}

const OrderRow = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderSummary"]
}>): JSX.Element => {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const toggleExpanded = useCallback(() => {
    setExpanded((previous) => !previous)
  }, [])

  return (
    <div>
      <OrderRowHeader detailsId={detailsId} expanded={expanded} order={order} toggleExpanded={toggleExpanded} />
      <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" id={detailsId}>
          {expanded && <OrderRowDetails order={order} />}
        </div>
      </div>
    </div>
  )
}

const OrderRowHeader = ({
  detailsId,
  expanded,
  order,
  toggleExpanded,
}: Readonly<{
  detailsId: string
  expanded: boolean
  order: CustomerAccount["orderSummary"]
  toggleExpanded: () => void
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const format = useFormatter()
  const totalLabel = format.number(centsToDisplayAmount(order.totalMinorUnits), {
    currency: order.currencyCode,
    style: "currency",
  })

  const dateLabel = format.dateTime(order.createdAt, {
    dateStyle: "medium",
  })

  const hiddenItemCount = order.items.length - MAX_VISIBLE_IMAGES

  return (
    <button
      aria-controls={detailsId}
      aria-expanded={expanded}
      className="group flex w-full cursor-pointer items-center gap-5 py-5 text-left transition-colors"
      onClick={toggleExpanded}
      type="button"
    >
      <div className="flex items-center gap-3">
        {order.items.slice(0, MAX_VISIBLE_IMAGES).map((item, index) => (
          <div className="relative size-14 shrink-0 overflow-hidden bg-muted" key={item.id} style={index > 0 ? OVERLAP_STYLE : undefined}>
            <Image
              alt={item.name}
              className="absolute inset-0 size-full object-cover"
              height={56}
              src={item.image ?? PLACEHOLDER_IMAGE}
              width={56}
            />
          </div>
        ))}
        {hiddenItemCount > NO_HIDDEN_ITEMS && (
          <span
            className="relative flex size-14 shrink-0 items-center justify-center bg-muted text-[12px] tabular-nums"
            style={OVERLAP_STYLE}
          >
            {t("moreItems", { count: hiddenItemCount })}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] tracking-[0.02em]">{order.orderNumber}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{dateLabel}</p>
        <p className="mt-1 text-[12px] tabular-nums sm:hidden">
          {totalLabel}
          <span className="text-muted-foreground"> · {t(`status.${order.filterStatus}`)}</span>
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-[13px] tracking-[0.02em] tabular-nums">{totalLabel}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`status.${order.filterStatus}`)}</p>
      </div>

      <ChevronDown
        className={`size-4 shrink-0 text-muted-foreground/50 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        strokeWidth={1.5}
      />
    </button>
  )
}

const OrderRowDetails = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderSummary"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const orderParams = useMemo(
    () => ({
      id: order.id,
    }),
    [order.id],
  )

  return (
    <div className="pb-6 pl-0 sm:pl-19">
      <div className="divide-y divide-border/50">
        {order.items.map((item) => (
          <OrderRowItem currencyCode={order.currencyCode} item={item} key={item.id} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <LocalizedLink
          className="text-[11px] tracking-[0.15em] text-foreground uppercase transition-colors hover:text-muted-foreground"
          params={orderParams}
          to={ROUTES.ACCOUNT_ORDER}
        >
          {t("viewDetails")}
        </LocalizedLink>
      </div>
    </div>
  )
}

const OrderRowItem = ({
  currencyCode,
  item,
}: Readonly<{
  currencyCode: string
  item: CustomerAccount["orderItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const format = useFormatter()
  const money = (minorUnits: number) =>
    format.number(centsToDisplayAmount(minorUnits), {
      currency: currencyCode,
      style: "currency",
    })

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden bg-muted">
        <Image
          alt={item.name}
          className="absolute inset-0 size-full object-cover"
          height={48}
          src={item.image ?? PLACEHOLDER_IMAGE}
          width={48}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{item.name}</p>
        {item.variantTitle !== undefined && item.variantTitle !== "" && (
          <p className="text-[11px] text-muted-foreground">{item.variantTitle}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{t("qtyAtPrice", { price: money(item.unitPriceMinorUnits), qty: item.qty })}</p>
      </div>
      <p className="text-[13px] tabular-nums">{money(item.lineTotalMinorUnits)}</p>
    </div>
  )
}

export const Route = createFileRoute("/account/orders/")({
  component: OrdersPage,
  head: pageHead,
  loader: async ({ context, deps }) => {
    await context.queryClient.query({
      ...listCustomerOrdersQuery(deps),
      staleTime: "static",
    })

    return accountPageMeta(context.queryClient, context.locale, "orders")
  },
  loaderDeps: ({ search }: { search: OrdersSearch }) => ({ filter: search.filter, page: search.page }),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  validateSearch: ordersSearchSchema,
})

const FIRST_PAGE = 1

const PAGE_STEP = 1

const MAX_VISIBLE_IMAGES = 3

const NO_HIDDEN_ITEMS = 0

const ALL_ORDERS_SEARCH = { filter: "all", page: FIRST_PAGE } as const

const OVERLAP_STYLE = {
  marginLeft: "-0.5rem",
}

import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { CUSTOMER_ACCOUNT_ORDER_FILTERS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { listCustomerOrdersQuery } from "~/src/modules/customer-account/use-cases/list-customer-orders"

import { pageHead } from "~/src/lib/seo"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { OrdersFilterLink } from "~/src/presentation/components/custom/pages/account/orders/orders-filter-link"
import { OrdersList } from "~/src/presentation/components/custom/pages/account/orders/orders-list"
import { OrdersPagination } from "~/src/presentation/components/custom/pages/account/orders/orders-pagination"

const FIRST_PAGE = 1

const ordersSearchSchema = zod.object({
  filter: zod.enum(CUSTOMER_ACCOUNT_ORDER_FILTERS).default("all"),
  page: zod.coerce.number().int().min(FIRST_PAGE).default(FIRST_PAGE),
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
            <OrdersFilterLink currentFilter={filter} key={option} option={option} />
          ))}
        </div>
        <Separator className="mt-4 mb-0" />
      </div>

      <div className="pt-4">
        <OrdersList filter={filter} orders={ordersPage.orders} />

        {lastPage > FIRST_PAGE && <OrdersPagination filter={filter} lastPage={lastPage} page={ordersPage.page} />}
      </div>
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

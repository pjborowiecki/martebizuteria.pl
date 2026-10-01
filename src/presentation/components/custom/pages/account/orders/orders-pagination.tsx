import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"

import { PaginationLink } from "~/src/presentation/components/custom/pages/account/orders/orders-pagination-link"

const FIRST_PAGE = 1

const PAGE_STEP = 1

export const OrdersPagination = ({
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

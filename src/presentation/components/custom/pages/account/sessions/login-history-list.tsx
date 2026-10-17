import { type JSX, useState, useTransition } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { LIST_PAGE_FIRST, LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import { CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerLoginHistoryPageQuery } from "~/src/modules/customer-account/use-cases/get-customer-login-history-page"

import { LoginHistoryItem } from "~/src/presentation/components/custom/pages/account/sessions/login-history-item"

const PAGE_BUTTON_CLASS =
  "touch-target cursor-pointer text-[11px] tracking-[0.15em] text-foreground uppercase hover:underline disabled:cursor-default disabled:text-muted-foreground/40 disabled:no-underline"

export const LoginHistoryList = (): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const [page, setPage] = useState<number>(LIST_PAGE_FIRST)
  const [isPending, startTransition] = useTransition()
  const { data } = useSuspenseQuery(getCustomerLoginHistoryPageQuery({ page, pageSize: CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE }))
  const lastPage = Math.ceil(data.total / CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE)

  const goTo = (next: number): void => {
    startTransition(() => {
      setPage(next)
    })
  }

  if (data.total === 0) {
    return <p className="py-6 text-[13px] text-muted-foreground">{t("noLoginHistory")}</p>
  }

  return (
    <>
      <div aria-busy={isPending} className={cn("divide-y divide-border transition-opacity", isPending && "opacity-60")}>
        {data.items.map((entry) => (
          <LoginHistoryItem entry={entry} key={entry.id} />
        ))}
      </div>
      {lastPage > LIST_PAGE_FIRST && (
        <nav aria-label={t("historyPagination")} className="flex items-center justify-between border-t border-border pt-6">
          <button
            className={PAGE_BUTTON_CLASS}
            disabled={page <= LIST_PAGE_FIRST || isPending}
            onClick={() => {
              goTo(page - LIST_PAGE_STEP)
            }}
            type="button"
          >
            {t("previousPage")}
          </button>
          <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("pageOf", { page, total: lastPage })}</p>
          <button
            className={PAGE_BUTTON_CLASS}
            disabled={page >= lastPage || isPending}
            onClick={() => {
              goTo(page + LIST_PAGE_STEP)
            }}
            type="button"
          >
            {t("nextPage")}
          </button>
        </nav>
      )}
    </>
  )
}

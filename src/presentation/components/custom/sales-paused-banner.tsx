import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { PauseCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getSalesStatusQuery } from "~/src/modules/store-setting/use-cases/get-sales-status"

export const SalesPausedBanner = (): JSX.Element | undefined => {
  const t = useTranslations("pages.cart.salesPaused")
  const { data } = useQuery(getSalesStatusQuery())
  if (data?.salesPaused !== true) {
    return undefined
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-foreground" role="status">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
        <PauseCircle aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        <p>{t("banner")}</p>
      </div>
    </div>
  )
}

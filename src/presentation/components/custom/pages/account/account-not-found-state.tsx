import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const AccountNotFoundState = (): JSX.Element => {
  const t = useTranslations("pages.account.errorState")

  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("notFoundTitle")}</p>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{t("notFoundDescription")}</p>
      </div>
      <LocalizedLink
        className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
        to={ROUTES.ACCOUNT_ORDERS}
      >
        {t("backToOrders")}
      </LocalizedLink>
    </div>
  )
}

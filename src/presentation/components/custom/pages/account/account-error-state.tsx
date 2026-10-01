import { type JSX, useCallback } from "react"

import { useRouter } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const AccountErrorState = (): JSX.Element => {
  const t = useTranslations("pages.account.errorState")
  const router = useRouter()
  const handleRetry = useCallback(() => {
    void router.invalidate()
  }, [router])

  return (
    <div className="flex flex-col items-start gap-4 border border-destructive/30 bg-destructive/5 px-6 py-10">
      <AlertCircle aria-hidden className="size-6 text-destructive" strokeWidth={1.3} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{t("description")}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button className="rounded-none text-xs tracking-[0.15em] uppercase" onClick={handleRetry} type="button">
          {t("retry")}
        </Button>
        <LocalizedLink
          className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground"
          to={ROUTES.ACCOUNT_OVERVIEW}
        >
          {t("backToAccount")}
        </LocalizedLink>
      </div>
    </div>
  )
}

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

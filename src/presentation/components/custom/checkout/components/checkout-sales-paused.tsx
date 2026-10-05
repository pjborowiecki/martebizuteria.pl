import { type JSX } from "react"

import { PauseCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const CheckoutSalesPaused = (): JSX.Element => {
  const t = useTranslations("pages.checkout")

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center md:py-20" role="status">
      <PauseCircle aria-hidden className="size-16 text-muted-foreground md:size-20" strokeWidth={1} />

      <div className="space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl">{t("salesPaused.title")}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">{t("salesPaused.description")}</p>
      </div>

      <LocalizedLink
        className="flex h-12 items-center justify-center bg-foreground px-8 text-xs tracking-[0.2em] text-background uppercase transition-colors hover:bg-foreground/90"
        to={ROUTES.CART}
      >
        {t("checkoutForm.backToCart")}
      </LocalizedLink>
    </div>
  )
}

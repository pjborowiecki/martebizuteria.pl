import { type JSX } from "react"

import { RotateCcw, ShieldCheck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const CartSummary = ({ checkoutDisabled = false, salesPaused = false, subtotal }: Readonly<CartSummaryProps>): JSX.Element => {
  const t = useTranslations("pages.cart")

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="space-y-6 border border-foreground/10 p-5 sm:p-8">
        <h2 className="font-serif text-xl tracking-tight">{t("summary.title")}</h2>
        <Separator className="bg-foreground/10" />

        <div className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{t("summary.subtotal")}</span>
            <span className="text-right">{subtotal}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{t("summary.shipping")}</span>
            <span className="text-right text-muted-foreground">{t("summary.shippingValue")}</span>
          </div>
        </div>

        <Separator className="bg-foreground/10" />

        <div className="flex justify-between gap-4">
          <span className="font-medium">{t("summary.total")}</span>
          <span className="font-medium">{subtotal}</span>
        </div>

        {salesPaused && (
          <p className="text-center text-sm leading-relaxed text-foreground" role="status">
            {t("salesPaused.checkoutClosed")}
          </p>
        )}

        {checkoutDisabled || salesPaused ? (
          <span
            aria-disabled="true"
            className="flex h-13 w-full cursor-not-allowed items-center justify-center bg-primary/50 text-sm font-medium tracking-wide text-primary-foreground/80"
          >
            {t("summary.checkout")}
          </span>
        ) : (
          <LocalizedLink
            to={ROUTES.CHECKOUT}
            className="flex h-13 w-full items-center justify-center bg-primary text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("summary.checkout")}
          </LocalizedLink>
        )}

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">{t("summary.note")}</p>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="text-xs leading-tight">{t("trust.securePayment")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RotateCcw className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="text-xs leading-tight">{t("trust.returns")}</span>
        </div>
      </div>
    </aside>
  )
}

interface CartSummaryProps {
  readonly checkoutDisabled?: boolean
  readonly salesPaused?: boolean
  readonly subtotal: string
}

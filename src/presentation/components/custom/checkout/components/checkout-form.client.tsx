import { type JSX } from "react"

import "@tanstack/react-start/client-only"
import { Lock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { CheckoutFormProvider } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CheckoutStep } from "~/src/presentation/components/custom/checkout/components/checkout-step.client"
import { CheckoutSummary } from "~/src/presentation/components/custom/checkout/components/checkout-summary"
import { CHECKOUT_STEPS } from "~/src/presentation/components/custom/checkout/lib/checkout-step-loaders.client"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const CheckoutForm = (): JSX.Element => {
  const t = useTranslations("pages.checkout")

  return (
    <CheckoutFormProvider>
      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-2 md:gap-3 lg:col-span-8">
          <div className={EYEBROW_CLASS}>
            <Lock aria-hidden className="mr-2 size-4 shrink-0 text-foreground/70" strokeWidth={1.15} />
            <span>{t("secureCheckout")}</span>
          </div>
          <div className="flex flex-col gap-4 md:gap-6">
            {CHECKOUT_STEPS.map((stepConfig, index) => (
              <CheckoutStep key={stepConfig.id} stepConfig={stepConfig} stepIndex={index} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:gap-3 lg:col-span-4">
          <div className={`${EYEBROW_CLASS} justify-between gap-4`}>
            <span>{t("checkoutSummary.title")}</span>
            <LocalizedLink
              to={ROUTES.CART}
              className="shrink-0 tracking-[0.15em] underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {t("checkoutSummary.edit")}
            </LocalizedLink>
          </div>
          <CheckoutSummary />
        </div>
      </div>
    </CheckoutFormProvider>
  )
}

const EYEBROW_CLASS = "flex min-h-6 items-center text-xs font-medium tracking-[0.28em] text-muted-foreground uppercase"

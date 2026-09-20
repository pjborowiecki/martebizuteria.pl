import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
export const BillingAddress = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { getValues } = useCheckoutForm()
  const values = getValues()
  if (values.sameAsShipping === true) {
    return <p className="text-xs text-muted-foreground italic">{t("sameAsShipping")}</p>
  }
  const getCountryName = (code?: string) => {
    if (code === "PL") {
      return t("countries.PL")
    }
    return code
  }
  return (
    <div className="space-y-1">
      <p className="text-base leading-relaxed text-foreground">
        {values.billingFirstName} {values.billingLastName}
      </p>
      <p className="text-base leading-relaxed text-foreground">{values.billingAddress1}</p>
      <p className="text-base leading-relaxed text-foreground">
        {values.billingPostalCode} {values.billingCity}
      </p>
      <p className="text-base leading-relaxed text-foreground">{getCountryName(values.billingCountryCode)}</p>
    </div>
  )
}
